const { SlashCommandBuilder } = require('discord.js');
const { Tags } = require('../../database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('wholinked')
		.setDescription('Lists all users in the server with a linked iRacing ID.'),
	async execute(interaction) {
		const guildId = interaction.guild.id;

		try {
			const tagList = await Tags.findAll({ where: { guild_id: guildId } });

			if (tagList.length === 0) {
				return interaction.reply({ content: 'No users in this server have linked their iRacing ID.', flags: 64 });
			}

			const promises = tagList.map(async (tag) => {
				const member = await interaction.guild.members.fetch(tag.discord_id).catch(() => null);
				if (member) {
					return `${member.user.tag} (iRacing ID: ${tag.iRacing_ID})`;
				}
				else {
					return `User with ID ${tag.discord_id} (iRacing ID: ${tag.iRacing_ID}) is no longer in the server.`;
				}
			});

			const memberList = await Promise.all(promises);
			await interaction.reply({ content: `**Users with linked iRacing IDs:**\n${memberList.join('\n')}`, flags: 64 });
		}
		catch (error) {
			console.error('Error listing linked users:', error);
			await interaction.reply({ content: 'There was an error while executing this command!', flags: 64 });
		}
	},
};