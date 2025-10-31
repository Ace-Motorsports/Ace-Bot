const { Tags } = require('./database');
const { guildId, iracingUser, iracingPassword, iracingClientId, iracingClientSecret } = require('./config/config.json');
const axios = require('axios');

const OAUTH_URL = 'https://oauth.iracing.com/oauth2/token';
const API_URL = 'https://members-ng.iracing.com';

let accessToken = null;
let isRefreshingToken = false;
let requestQueue = [];

const axiosInstance = axios.create({ baseURL: API_URL });

const getAccessToken = async () => {
  console.log('Getting new access token');
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', iracingClientId);
  params.append('client_secret', iracingClientSecret);
  params.append('username', iracingUser);
  params.append('password', iracingPassword);

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
    if (!accessToken) {
      await getAccessToken();
    }

    const tagList = await Tags.findAll({ attributes: ['discord_id', 'iRacing_ID'] });
    const guild = await client.guilds.fetch(guildId);

    for (const tag of tagList) {
      const discordId = tag.get('discord_id');
      const iracingId = tag.get('iRacing_ID');
      let member;

      try {
        member = await guild.members.fetch(discordId);
      } catch (err) {
        member = null;
      }

      if (member) {
        console.log(`Found member: ${member.user.tag} with iRacing ID: ${iracingId}`);
        const response = await axiosInstance.get('/data/member/get', {
          params: {
            cust_ids: iracingId,
            include_licenses: true,
          },
        });

        const memberData = response.data.members[0];
        const roadLicense = memberData.licenses.find(l => l.cat_id === 2); // Assuming road license is what we want

        if (roadLicense) {
            const sr = roadLicense.safety_rating;
            let ir = roadLicense.irating;
            if (ir > 999) {
                ir = (ir / 1000).toFixed(1) + 'k';
            }
            const srclass = roadLicense.group_id;
            const name = memberData.display_name;
            const names = name.split(' ');
            const first_name = names[0];
            let last_name = names[names.length - 1];
            last_name = Array.from(last_name)[0].toUpperCase();
            const nick = `${first_name} ${last_name}. SR: ${sr} IR: ${ir}`;

            let roleName;
            switch (srclass) {
                case 1: roleName = 'Rookie'; break;
                case 2: roleName = 'Class-D'; break;
                case 3: roleName = 'Class-C'; break;
                case 4: roleName = 'Class-B'; break;
                case 5: roleName = 'Class-A'; break;
                default: roleName = null;
            }

            if (roleName) {
                const role = guild.roles.cache.find(r => r.name === roleName);
                if (role && !member.roles.cache.has(role.id)) {
                    await member.roles.remove(member.roles.cache.filter(r => r.name.startsWith('Class') || r.name === 'Rookie'));
                    await member.roles.add(role);
                    console.log(`Assigned role ${roleName} to ${member.user.tag}`);
                }
            }
            await member.setNickname(nick);
            console.log(`Set nickname for ${member.user.tag} to "${nick}"`);
        }
      } else {
        console.log(`Member with Discord ID ${discordId} not found in the guild.`);
        const existingTag = await Tags.findOne({ where: { discord_id: discordId } });
        if (existingTag) {
          await existingTag.destroy();
          console.log(`Deleted tag for Discord ID: ${discordId}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in refreshUsers:', error.response ? error.response.data : error.message);
  }
}

module.exports = refreshUsers;
