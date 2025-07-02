const { Tags } = require('./database');
const { Client, GatewayIntentBits } = require('discord.js');
const { discord_token, guildId, iracingUser, iracingPassword } = require('./config/config.json');
const axios = require('axios');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers], shards: 'auto' });
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
	// const members = await guild.members.fetch();

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
			result = response.data.link;
			const userresult = await axios.get(result);
			const sr = userresult.data.members[0].licenses[1].safety_rating;
			let ir = userresult.data.members[0].licenses[1].irating;
			if (ir > 999) {
				ir = (ir / 1000).toFixed(1);
				ir = ir + 'k';
			}
			const srclass = userresult.data.members[0].licenses[1].group_id;
			const name = userresult.data.members[0].display_name;
			const names = name.split(' ');
			const first_name = names[0];
			let last_name = names[names.length - 1];
			last_name = Array.from(last_name)[0].toUpperCase();
			const nick = first_name + ' ' + last_name + '. SR: ' + sr + ' IR: ' + ir;
			let roleName;
			switch (srclass) {
			case 1:
				roleName = 'Rookie';
				break;
			case 2:
				roleName = 'Class-D';
				break;
			case 3:
				roleName = 'Class-C';
				break;
			case 4:
				roleName = 'Class-B';
				break;
			case 5:
				roleName = 'Class-A';
				break;
			default:
				roleName = null;
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
		else {
			console.log(`Member with Discord ID ${discordId} not found in the guild.`);
			const existingTag = await Tags.findOne({ where: { discord_id: discordId } });
			if (existingTag) {
				await existingTag.destroy();
				console.log(`Deleted tag for Discord ID: ${discordId}`);
			}
		}
	}
	client.destroy();
	client.once('shardDisconnect', () => {
		process.exit(0);
	});
});

client.login(discord_token);