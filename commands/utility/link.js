const { SlashCommandBuilder } = require('discord.js');
const { Tags } = require('../../database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('link')
		.setDescription('Link your Discord account with your iRacing ID.')
		.addIntegerOption(option =>
			option.setName('iracing_id')
				.setDescription('Your iRacing ID')
				.setRequired(true),
		)
		.addBooleanOption(option =>
			option.setName('display_license')
				.setDescription('Whether to display your iRacing license in your nickname. Defaults to true.'),
		),
	async execute(interaction) {
		const iracingId = interaction.options.getInteger('iracing_id');
		const displayLicense = interaction.options.getBoolean('display_license');
		const discordId = interaction.user.id;
		const guildId = interaction.guild.id;

		try {
			const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
			const member = interaction.member;

			if (member.roles.highest.position >= botMember.roles.highest.position) {
				return interaction.reply({ content: 'I cannot link your account because you have a higher or equal role than me.', flags: 64 });
			}

			const existingTag = await Tags.findOne({ where: { discord_id: discordId, guild_id: guildId } });

			if (existingTag) {
				const updateData = { iRacing_ID: iracingId };
				if (displayLicense !== null) {
					updateData.display_license = displayLicense;
				}
				await existingTag.update(updateData);

				let replyMessage = `Your iRacing ID has been updated to ${iracingId}.`;
				if (displayLicense !== null) {
					replyMessage += ` Your license display preference has been updated to ${displayLicense}.`;
				}

				await interaction.reply({ content: replyMessage, flags: 64 });
			}
			else {
				const displayLicenseValue = displayLicense ?? true;
				await Tags.create({ discord_id: discordId, guild_id: guildId, iRacing_ID: iracingId, display_license: displayLicenseValue });
				await interaction.reply({ content: `Your Discord account has been linked with iRacing ID: ${iracingId}. Your license display preference is set to ${displayLicenseValue}.`, flags: 64 });
			}
		}
		catch (error) {
			console.error('Error linking iRacing ID:', error);
			await interaction.reply({ content: 'There was an error linking your iRacing ID. Please try again later.', flags: 64 });
		}
	},
};
