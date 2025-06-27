const { SlashCommandBuilder } = require('discord.js');
const { sequelize, Tags } = require('../../database'); // Adjust path if needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlink')
        .setDescription('Unlink your Discord account from your iRacing ID.'),
    async execute(interaction) {
        const discordId = interaction.user.id;

		try {
			// Check if the user already has a linked iRacing ID
			const existingTag = await Tags.findOne({ where: { discord_id: discordId } });

			if (existingTag) {
				// Update the existing record
				await existingTag.destroy();
				await interaction.reply(`Your iRacing ID has been unlinked.`);
			} else {
				await interaction.reply(`Your Discord account is not linked with any iRacing ID.`);
			}
		} catch (error) {
			console.error('Error unlinking iRacing ID:', error);
			await interaction.reply({ content: 'There was an error unlinking your iRacing ID. Please try again later.', ephemeral: true });
		}
    }
};