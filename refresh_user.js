const { Tags } = require('./database');
const { guildId, iracingUser, iracingPassword, iracingClientId, iracingClientSecret, ipc_port } = require('./config/config.json');
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
  // ... (rest of the refreshUsers function is the same)
}

// --- IPC Trigger Logic ---
if (require.main === module) {
    // This block runs if the script is executed directly (e.g., `node refresh_user.js`)
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
        process.exit(1); // Exit with an error code for cron
    });

} else {
    // This block runs if the script is imported by another file (e.g., `require('./refresh_user')`)
    module.exports = refreshUsers;
}