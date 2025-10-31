const { SlashCommandBuilder } = require('discord.js');
const { Tags } = require('../../database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unlink')
		.setDescription('Unlink your Discord account from your iRacing ID.'),
	async execute(interaction) {
		const discordId = interaction.user.id;
		const guildId = interaction.guild.id;

		try {
			// Check if the user already has a linked iRacing ID
			const existingTag = await Tags.findOne({ where: { discord_id: discordId, guild_id: guildId } });

			if (existingTag) {
				// Update the existing record
				await existingTag.destroy();
				await interaction.reply({ content: 'Your iRacing ID has been unlinked.', ephemeral: true });
			}
			else {
				await interaction.reply({ content: 'Your Discord account is not linked with any iRacing ID.', ephemeral: true });
			}
		}
		catch (error) {
			console.error('Error unlinking iRacing ID:', error);
			await interaction.reply({ content: 'There was an error unlinking your iRacing ID. Please try again later.', ephemeral: true });
		}
	},
};