const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { sequelize, GuildSettings } = require('./database');
const { Client, Collection, Events, GatewayIntentBits, ChannelType } = require('discord.js');
const { discord_token, ipc_port } = require('./config/config.json');
const refreshUsers = require('./refresh_user');
const deployGuildCommands = require('./deploy-single-guild-commands');

const IPC_PORT = ipc_port || 8081;

const clientOptions = {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers],
    shards: 'auto',
};
const client = new Client(clientOptions);

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
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required \"data\" or \"execute\" property.`);
        }
    }
}

client.once(Events.ClientReady, readyClient => {
    sequelize.sync({ alter: true })
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
        });
    }).listen(IPC_PORT, '127.0.0.1', () => {
        console.log(`IPC server listening on localhost port ${IPC_PORT}`);
    });

    ipcServer.on('error', (err) => {
        console.error('IPC server error:', err);
    });
});

client.on(Events.GuildCreate, async guild => {
    console.log(`Joined a new guild: ${guild.name} (${guild.id})`);
    await deployGuildCommands(guild.id);
});

client.on(Events.GuildDelete, async guild => {
    console.log(`Left a guild: ${guild.name} (${guild.id})`);
    try {
        await GuildSettings.destroy({ where: { guild_id: guild.id } });
        console.log(`Successfully deleted settings for guild ${guild.id}`);
    } catch (error) {
        console.error(`Failed to delete settings for guild ${guild.id}:`, error);
    }
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
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

// Store created temp channels
const tempChannels = new Map();

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const { guild, member } = newState;
    const guildSettings = await GuildSettings.findByPk(guild.id);

    if (!guildSettings || !guildSettings.temp_channel_id) {
        return;
    }

    const lobbyChannelId = guildSettings.temp_channel_id;
    const categoryId = guildSettings.temp_category_id;

    // User joins the lobby channel
    if (newState.channelId === lobbyChannelId) {
        try {
            const category = guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                console.error('Temporary channel category not found or is not a category.');
                return;
            }

            const raceChannels = category.children.cache.filter(c => c.name.startsWith('Race Room'));
            let nextRaceNumber = 1;
            if (raceChannels.size > 0) {
                const raceNumbers = raceChannels.map(c => {
                    const match = c.name.match(/^Race Room (\d+)/);
                    return match ? parseInt(match[1], 10) : 0;
                });
                nextRaceNumber = Math.max(...raceNumbers) + 1;
            }

            const channelName = `Race Room ${nextRaceNumber} - ${member.displayName}`;
            const newChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: categoryId,
                userLimit: 99,
            });

            await newState.setChannel(newChannel);
            tempChannels.set(newChannel.id, guild.id);
            console.log(`Created temporary channel \"${channelName}\" in guild \"${guild.name}\".`);
        } catch (error) {
            console.error('Error creating temporary channel:', error);
        }
    }

    // User leaves a voice channel
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const oldChannel = oldState.channel;
        if (tempChannels.has(oldChannel.id) && oldChannel.members.size === 0) {
            try {
                await oldChannel.delete();
                tempChannels.delete(oldChannel.id);
                console.log(`Deleted empty temporary channel \"${oldChannel.name}\" in guild \"${guild.name}\".`);
            } catch (error) {
                console.error('Error deleting temporary channel:', error);
            }
        }
    }
});

client.login(discord_token);