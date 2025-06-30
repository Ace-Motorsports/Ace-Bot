const { Tags } = require('./database');
const { Client, GatewayIntentBits } = require('discord.js');
const { discord_token, guildId, iracingUser, iracingPassword } = require('./config/config.json');
const axios = require('axios');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const CryptoJS = require('crypto-js');

const hash = CryptoJS.SHA256(iracingPassword + iracingUser.toLowerCase());
const hashInBase64 = CryptoJS.enc.Base64.stringify(hash);

const BASE_URL = 'https://members-ng.iracing.com/auth';
const axiosInstance = axios.create({ baseURL: BASE_URL });

const createSession = async (user, pass) => {
	console.log('create session');
	const authParams = {
		email: user,
		password: pass,
	};
	const resp = await axios.post(BASE_URL, authParams);
	const cookie = resp.headers['set-cookie'];
	axiosInstance.defaults.headers.Cookie = cookie;
	return cookie;
};

let isGetActiveSessionRequest = false;
let requestQueue = [];

const callRequestsFromQueue = cookie => {
	requestQueue.forEach(sub => sub(cookie));
};
const addRequestToQueue = sub => {
	requestQueue.push(sub);
};
const clearQueue = () => {
	requestQueue = [];
};

axiosInstance.interceptors.response.use(null, (error) => {
	console.error(error.message);

	const { response = {}, config: sourceConfig } = error;

	// checking if request failed cause Unauthorized
	if (response.status === 401) {
		// if this request is first we set isGetActiveSessionRequest flag to true and run createSession
		if (!isGetActiveSessionRequest) {
			isGetActiveSessionRequest = true;
			createSession(iracingUser, hashInBase64)
				.then((cookie) => {
					// when createSession resolve with cookie value we run all request from queue with new cookie
					isGetActiveSessionRequest = false;
					callRequestsFromQueue(cookie);
					clearQueue();
				})
				.catch((e) => {
					isGetActiveSessionRequest = false;
					console.error('Create session error %s', e.message);
					clearQueue();
				});
		}

		// and while isGetActiveSessionRequest equal true we create and return new promise
		const retryRequest = new Promise((resolve) => {
			// we push new function to queue
			addRequestToQueue((cookie) => {
				// function takes one param 'cookie'
				console.log(
					'Retry with new session context %s request to %s',
					sourceConfig.method,
					sourceConfig.url,
				);
				sourceConfig.headers.Cookie = cookie;
				resolve(axios(sourceConfig));
			});
		});

		return retryRequest;
	}
	else {
		// if error is not related with Unauthorized we just reject promise
		return Promise.reject(error);
	}
});

async function readTags() {
	try {
		const tagList = await Tags.findAll({ attributes: ['discord_id', 'iRacing_ID'] });
		const tagStrings = tagList.map(tag => `[${tag.get('discord_id')}, ${tag.get('iRacing_ID')}]`);
		return tagStrings;
	}
	catch (error) {
		console.error('Error reading tags:', error);
		return [];
	}
}

readTags().then(async tagStrings => {
	// Fetch the guild by ID (replace 'YOUR_GUILD_ID' with your actual guild/server ID)
	const guild = await client.guilds.fetch(guildId);
	await guild.members.fetch();

	for (const element of tagStrings) {
		const [discordId, iracingId] = element.slice(1, -1).split(', ');
		let member;
		try {
			member = await guild.members.fetch(discordId);
		}
		catch (err) {
			member = null;
		}
		if (member) {
			console.log(`Found member: ${member.user.tag} with iRacing ID: ${iracingId}`);
			const response = await axiosInstance.get('https://members-ng.iracing.com/data/member/get',
				{
					params: {
						cust_ids: iracingId,
						include_licenses: true,
					},
				});
			console.log(response);
		}
		else {
			console.log(`Member with Discord ID ${discordId} not found in the guild.`);
			const existingTag = await Tags.findOne({ where: { discord_id: discordId } });
			if (existingTag) {
				await existingTag.destroy();
				console.log(`Deleted tag for Discord ID: ${discordId}`);
			}
		}
	}
	process.exit(0);
});

client.login(discord_token);