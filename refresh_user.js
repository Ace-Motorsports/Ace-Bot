const { Tags } = require('./database');
const { Client, GatewayIntentBits } = require('discord.js');
const { discord_token, guildId, iracingUser, iracingPassword } = require('./config/config.json');
const axios = require('axios');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const CryptoJS = require('crypto-js');

const hash = CryptoJS.SHA256(iracingPassword + iracingUser.toLowerCase());
const hashInBase64 = CryptoJS.enc.Base64.stringify(hash);

async function auth(username, password) {
	const response = await axios.post(
		'https://members-ng.iracing.com/auth',
		{ email: username, password: password },
		{ headers: { 'Content-Type': 'application/json' } },
	);
	const setCookieHeaders = response.headers['set-cookie'];
	if (setCookieHeaders) {
		for (const cookieStr of setCookieHeaders) {
			const [cookiePair] = cookieStr.split(';');
			const [key, value] = cookiePair.split('=');
			if (key.trim() === 'authtoken_members') {
				const cookie = value.trim();
				return cookie;
			}
		}
	}
}

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
	const cookie = await auth(iracingUser, hashInBase64);
	console.log('authtoken_members:', cookie);

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