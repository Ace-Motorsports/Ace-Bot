const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { sequelize } = require('./database');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { discord_token, channelId, categoryId, ipc_port } = require('./config/config.json');
const refreshUsers = require('./refresh_user');

const IPC_PORT = ipc_port || 8081;

const clientOptions = {
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
	shards: 'auto',
};
const client = new Client(clientOptions);
const TempChannels = require('@gamers-geek/discord-temp-channels');
const tempChannels = new TempChannels(client);

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
const isDevelopment = process.env.NODE_ENV === 'development';

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			const commandName = isDevelopment ? 'd' + command.data.name : command.data.name;
			client.commands.set(commandName, command);
		}
		else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.once(Events.ClientReady, readyClient => {
	sequelize.sync()
		.then(() => {
			console.log('Database synchronized successfully.');
		})
		.catch(err => {
			console.error('Failed to synchronize database:', err);
		});
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);

	// Initial refresh on startup
	refreshUsers(client).catch(console.error);

    // --- Start IPC Server ---
    const ipcServer = net.createServer(socket => {
        console.log('IPC client connected.');
        socket.on('data', data => {
            const message = data.toString().trim();
            if (message === 'REFRESH_USERS') {
                console.log('Manual user refresh triggered via IPC.');
                refreshUsers(client)
                    .then(() => {
                        console.log('IPC-triggered refresh completed successfully.');
                        socket.write('SUCCESS: Refresh complete.');
                    })
                    .catch(err => {
                        console.error('IPC-triggered refresh failed:', err);
                        socket.write('ERROR: Refresh failed.');
                    })
                    .finally(() => {
                        socket.end();
                    });
            } else {
				console.log('Unknown IPC message.');
				socket.write('ERROR: Unknown command.');
				socket.end();
			}
        });
        socket.on('end', () => {
            console.log('IPC client disconnected.');
        });
		socket.on('error', (err) => {
			console.error('IPC socket error:', err);
		})
    }).listen(IPC_PORT, '127.0.0.1', () => {
        console.log(`IPC server listening on localhost port ${IPC_PORT}`);
    });

	ipcServer.on('error', (err) => {
		console.error('IPC server error:', err);
	});
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
		else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});

tempChannels.registerChannel(channelId, {
	childCategory: categoryId,
	childAutoDeleteIfEmpty: true,
	childFormat: (member, count) => `Race room #${count}`,
});

client.login(discord_token);
