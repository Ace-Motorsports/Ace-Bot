const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};
// This code defines a simple ping command for a Discord bot using the discord.js library.
// When a user types `/ping`, the bot will respond with "Pong!".