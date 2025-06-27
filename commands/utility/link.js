const { SlashCommandBuilder } = require('discord.js');
const { sequelize, Tags } = require('../../database'); // Adjust path if needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Discord account with your iRacing ID.')
        .addStringOption(option =>
            option.setName('iracing_id')
                .setDescription('Your iRacing ID')
                .setRequired(true)
        ),
    async execute(interaction) {
        const iracingId = interaction.options.getString('iracing_id');
        const discordId = interaction.user.id;

		try {
			// Check if the user already has a linked iRacing ID
			const existingTag = await Tags.findOne({ where: { discord_id: discordId } });

			if (existingTag) {
				// Update the existing record
				await existingTag.update({ iRacing_ID: iracingId });
				await interaction.reply(`Your iRacing ID has been updated to ${iracingId}.`);
			} else {
				// Create a new record
				await Tags.create({ discord_id: discordId, iRacing_ID: iracingId });
				await interaction.reply(`Your Discord account has been linked with iRacing ID: ${iracingId}.`);
			}
		} catch (error) {
			console.error('Error linking iRacing ID:', error);
			await interaction.reply({ content: 'There was an error linking your iRacing ID. Please try again later.', ephemeral: true });
		}
    }
};