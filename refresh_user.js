const { Tags, GuildSettings } = require('./database');
const { iracingUser, iracingPassword, iracingClientId, iracingClientSecret, ipc_port } = require('./config/config.json');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const net = require('node:net');

const OAUTH_URL = 'https://oauth.iracing.com/oauth2/token';
const API_URL = 'https://members-ng.iracing.com';

let accessToken = null;
let isRefreshingToken = false;
let requestQueue = [];

const axiosInstance = axios.create({ baseURL: API_URL });

const getAccessToken = async () => {
  console.log('Getting new access token');

  const hashedPassword = CryptoJS.SHA256(iracingPassword + iracingUser.toLowerCase());
  const base64Password = CryptoJS.enc.Base64.stringify(hashedPassword);

  const hashedSecret = CryptoJS.SHA256(iracingClientSecret + iracingClientId.toLowerCase());
  const base64Secret = CryptoJS.enc.Base64.stringify(hashedSecret);

  const params = new URLSearchParams();
  params.append('grant_type', 'password_limited');
  params.append('scope', 'iracing.auth');
  params.append('client_id', iracingClientId);
  params.append('client_secret', base64Secret);
  params.append('username', iracingUser);
  params.append('password', base64Password);

  const resp = await axios.post(OAUTH_URL, params);
  accessToken = resp.data.access_token;
  axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  return accessToken;
};

const callRequestsFromQueue = (token) => {
  requestQueue.forEach(sub => sub(token));
  clearQueue();
};

const addRequestToQueue = (sub) => {
  requestQueue.push(sub);
};

const clearQueue = () => {
  requestQueue = [];
};

axiosInstance.interceptors.response.use(null, async (error) => {
  const { response = {}, config: sourceConfig } = error;

  if (response.status === 401 && !sourceConfig._retry) {
    sourceConfig._retry = true;
    if (!isRefreshingToken) {
      isRefreshingToken = true;
      try {
        const token = await getAccessToken();
        isRefreshingToken = false;
        callRequestsFromQueue(token);
        sourceConfig.headers['Authorization'] = `Bearer ${token}`;
        return axios(sourceConfig);
      } catch (e) {
        isRefreshingToken = false;
        console.error('Refresh token error %s', e.message);
        clearQueue();
        return Promise.reject(e);
      }
    }

    return new Promise((resolve) => {
      addRequestToQueue((token) => {
        console.log('Retrying with new token for request to %s', sourceConfig.url);
        sourceConfig.headers['Authorization'] = `Bearer ${token}`;
        resolve(axios(sourceConfig));
      });
    });
  }

  return Promise.reject(error);
});

async function refreshUsers(client) {
    try {
        console.log('[RefreshUsers] Starting user refresh process...');
        if (!accessToken) {
            await getAccessToken();
        }

        const guilds = await client.guilds.fetch();
        console.log(`[RefreshUsers] Refreshing users in ${guilds.size} guilds.`);

        for (const [guildId, oauth2guild] of guilds) {
            const guild = await oauth2guild.fetch();
            console.log(`\n[RefreshUsers] Processing guild: ${guild.name} (${guild.id})`);
            const tagList = await Tags.findAll({ where: { guild_id: guild.id } });
            console.log(`[RefreshUsers] Found ${tagList.length} users to refresh in this guild.`);

            for (const tag of tagList) {
                const discordId = tag.get('discord_id');
                const iracingId = tag.get('iRacing_ID');
                const displayLicense = tag.get('display_license');
                let member;

                try {
                    member = await guild.members.fetch(discordId);
                } catch (err) {
                    member = null;
                }

                if (member) {
                    console.log(`\n[RefreshUsers] Processing member: ${member.user.tag} (iRacing ID: ${iracingId})`);
                    let response = await axiosInstance.get('/data/member/get', {
                        params: { cust_ids: iracingId, include_licenses: true },
                    });

                    if (response.data.link) {
                        console.log(`[RefreshUsers] Following iRacing API link for ${iracingId}`);
                        response = await axios.get(response.data.link);
                    }

                    if (!response.data || !response.data.members || response.data.members.length === 0) {
                        console.log(`[RefreshUsers] No member data found for iRacing ID: ${iracingId}`);
                        continue;
                    }

                    const memberData = response.data.members[0];
                    const name = memberData.display_name;
                    let nick = name;

                    if (displayLicense) {
                      const roadLicense = memberData.licenses.find(l => l.category_id === 5);

                      if (roadLicense) {
                          const sr = roadLicense.safety_rating;
                          let ir = roadLicense.irating;
                          if (ir > 999) {
                              ir = (ir / 1000).toFixed(1) + 'k';
                          }
                          const srclass = roadLicense.group_id;
                          const licenseMap = { 1: 'R', 2: 'D', 3: 'C', 4: 'B', 5: 'A' };
                          const licenseClass = licenseMap[srclass] || '';
                          const names = name.split(' ');
                          const first_name = names[0];
                          let last_name = names[names.length - 1];
                          last_name = Array.from(last_name)[0].toUpperCase();
                          nick = `${first_name} ${last_name}. | ${licenseClass} ${sr.toFixed(2)} SR ${ir} IR`;
                      }
                    }

                    if (member.nickname !== nick) {
                        await member.setNickname(nick);
                        console.log(`[RefreshUsers] Set nickname for ${member.user.tag} to \"${nick}\"`);
                    }

                } else {
                    console.log(`[RefreshUsers] Member with Discord ID ${discordId} not found in guild ${guild.name}. Deleting tag.`);
                    await Tags.destroy({ where: { discord_id: discordId, guild_id: guild.id } });
                }
            }
        }
        console.log('\n[RefreshUsers] User refresh process finished.');
    } catch (error) {
        console.error('[RefreshUsers] CRITICAL ERROR during refresh process:', error.response ? error.response.data : error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        throw error;
    }
}

if (require.main === module) {
    const IPC_PORT = ipc_port || 8081;
    console.log(`[IPC Client] Attempting to trigger manual refresh via IPC on port ${IPC_PORT}...`);

    const ipcClient = net.createConnection({ port: IPC_PORT, host: '127.0.0.1' }, () => {
        console.log('[IPC Client] Connected to IPC server. Sending refresh command.');
        ipcClient.write('REFRESH_USERS');
    });

    ipcClient.on('data', (data) => {
        console.log('[IPC Client] Server Response:', data.toString());
        ipcClient.end();
    });

    ipcClient.on('end', () => {
        console.log('[IPC Client] Disconnected from IPC server.');
    });

    ipcClient.on('error', (err) => {
        console.error('[IPC Client] Could not connect to IPC server. Is the bot running?', err.message);
        process.exit(1);
    });

} else {
    module.exports = refreshUsers;
}
