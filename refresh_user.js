const { Tags } = require('./database'); // Ensure this is the correct path to your database file
const { Client, GatewayIntentBits } = require('discord.js');
const { token, guildId } = require('./config/config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

async function readTags() 
{
    try {
        const tagList = await Tags.findAll({ attributes: ['discord_id', 'iRacing_ID'] });
        const tagStrings = tagList.map(tag => `[${tag.discord_id}, ${tag.iRacing_ID}]`);
        return tagStrings;
    } catch (error) {
        console.error('Error reading tags:', error);
        return [];
    }
}

readTags().then(async tagStrings => {
    // Fetch the guild by ID (replace 'YOUR_GUILD_ID' with your actual guild/server ID)
    const guild = await client.guilds.fetch(guildId);
    await guild.members.fetch(); // Ensure all members are cached

    tagStrings.forEach(async element => {
        const [discordId, iracingId] = element.slice(1, -1).split(', ');
        const member = guild.members.cache.get(discordId);
        if (member) {
            console.log(`Found member: ${member.user.tag} with iRacing ID: ${iracingId}`);
            // Do something with the member and iracingId
        } else {
            console.log(`No member found for Discord ID: ${discordId}, deleting tag...`);
            await Tags.destroy({ where: { discord_id: discordId } });
        }
    });
    process.exit(0);  
});

client.login(token);