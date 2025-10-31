const { SlashCommandBuilder } = require('discord.js');
const { Tags } = require('../../database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('togglenick')
		.setDescription('Toggle the display of your iRacing license in your nickname.')
		.addBooleanOption(option =>
			option.setName('display')
				.setDescription('Whether to display your iRacing license in your nickname.')
				.setRequired(true),
		),
	async execute(interaction) {
		const display = interaction.options.getBoolean('display');
		const discordId = interaction.user.id;

		try {
			const tag = await Tags.findOne({ where: { discord_id: discordId } });

			if (tag) {
				await tag.update({ display_license: display });
				await interaction.reply(`Your nickname will now ${display ? 'show' : 'hide'} your iRacing license information.`);
			} else {
				await interaction.reply({ content: 'You do not have an iRacing ID linked. Please use the /link command first.', ephemeral: true });
			}
		}
		catch (error) {
			console.error('Error toggling nickname display:', error);
			await interaction.reply({ content: 'There was an error updating your preference. Please try again later.', ephemeral: true });
		}
	},
};