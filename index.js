const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on('message', message => {
    if (message.content === 'hello') {
        message.channel.send('Hello World~!');
    }
    if (message.content === 'testbot') {
        message.channel.send("Hi! I'm up and Running~!");
    }
    if (message.content === 'ping') {
        message.channel.send('Pong~!');
    } 
})

client.once('ready', () => {
    console.log('The Discord Bot is Ready!');
})

require('dotenv').config();
client.login(process.env.DISCORD_TOKEN);