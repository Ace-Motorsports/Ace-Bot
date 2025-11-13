const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { Tags } = require('../../database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('linkuser')
		.setDescription("Link a user's Discord account with their iRacing ID.")
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user to link.')
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName('iracing_id')
				.setDescription("The user's iRacing ID")
				.setRequired(true),
		)
		.addBooleanOption(option =>
			option.setName('display_license')
				.setDescription('Whether to display their iRacing license in their nickname. Defaults to true.'),
		)
		.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

	async execute(interaction) {
		const user = interaction.options.getUser('user');
		const iracingId = interaction.options.getInteger('iracing_id');
		const displayLicense = interaction.options.getBoolean('display_license');
		const discordId = user.id;
		const guildId = interaction.guild.id;

		try {
			const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
			const member = await interaction.guild.members.fetch(user.id);

			if (member.roles.highest.position >= botMember.roles.highest.position) {
				return interaction.reply({ content: 'I cannot link this account because they have a higher or equal role than me.', flags: 64 });
			}

			const existingTag = await Tags.findOne({ where: { discord_id: discordId, guild_id: guildId } });

			if (existingTag) {
				const updateData = { iRacing_ID: iracingId };
				if (displayLicense !== null) {
					updateData.display_license = displayLicense;
				}
				await existingTag.update(updateData);

				let replyMessage = `This user's iRacing ID has been updated to ${iracingId}.`;
				if (displayLicense !== null) {
					replyMessage += ` Their license display preference has been updated to ${displayLicense}.`;
				}

				await interaction.reply({ content: replyMessage, flags: 64 });
			}
			else {
				const displayLicenseValue = displayLicense ?? true;
				await Tags.create({ discord_id: discordId, guild_id: guildId, iRacing_ID: iracingId, display_license: displayLicenseValue });
				await interaction.reply({ content: `The user's Discord account has been linked with iRacing ID: ${iracingId}. Their license display preference is set to ${displayLicenseValue}.`, flags: 64 });
			}
		}
		catch (error) {
			console.error('Error linking iRacing ID:', error);
			await interaction.reply({ content: 'There was an error linking this iRacing ID. Please try again later.', flags: 64 });
		}
	},
};
