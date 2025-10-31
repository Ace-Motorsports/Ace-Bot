const { REST, Routes, Client, GatewayIntentBits } = require('discord.js');
const { clientId, discord_token } = require('./config/config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const foldersPath = path.join(__dirname, 'commands/admin');
const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));
const isDevelopment = process.env.NODE_ENV === 'development';

for (const file of commandFiles) {
	const filePath = path.join(foldersPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		const commandData = command.data;
		if (isDevelopment) {
			commandData.setName('d' + commandData.name);
		}
		commands.push(commandData.toJSON());
	}
	else {
		console.log(`[WARNING] The command at ${filePath} is missing a required \"data\" or \"execute\" property.`);
	}
}

const rest = new REST().setToken(discord_token);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

(async () => {
	try {
        await client.login(discord_token);
        const guildIds = client.guilds.cache.map(g => g.id);

        if (!guildIds || guildIds.length === 0) {
            console.log('Bot is not in any guilds to deploy commands to.');
            return;
        }

		console.log(`Started refreshing ${commands.length} application (/) commands for ${guildIds.length} guilds.`);

        for (const guildId of guildIds) {
            try {
                console.log(`Deploying commands to guild ${guildId}`);
                const data = await rest.put(
                    Routes.applicationGuildCommands(clientId, guildId),
                    { body: commands },
                );
                console.log(`Successfully reloaded ${data.length} application (/) commands for guild ${guildId}.`);
            } catch (error) {
                console.error(`Error deploying commands to guild ${guildId}:`, error);
            }
        }
	}
	catch (error) {
		console.error('Error fetching guilds or deploying commands:', error);
	} finally {
        client.destroy();
    }
})();
