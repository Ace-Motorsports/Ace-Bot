const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const { GuildSettings } = require('../../database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('set-temp-category')
		.setDescription('Sets the category where temporary channels will be created.')
		.addChannelOption(option =>
			option.setName('category')
				.setDescription('The category to create temporary channels in.')
				.addChannelTypes(ChannelType.GuildCategory)
				.setRequired(true),
		)
		.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
	async execute(interaction) {
		const category = interaction.options.getChannel('category');
		const guildId = interaction.guild.id;

		try {
			await GuildSettings.upsert({ guild_id: guildId, temp_category_id: category.id });
			await interaction.reply({ content: `The temporary channel category has been set to **${category.name}**.`, ephemeral: true });
		}
		catch (error) {
			console.error('Error setting temp category:', error);
			await interaction.reply({ content: 'There was an error while setting the temporary channel category. Please try again later.', ephemeral: true });
		}
	},
};