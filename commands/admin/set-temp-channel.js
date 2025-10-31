const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const { GuildSettings } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-temp-channel')
        .setDescription('Sets the voice channel that will trigger the creation of temporary channels.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The voice channel to use as the lobby.')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        try {
            await GuildSettings.upsert({ guild_id: guildId, temp_channel_id: channel.id });
            await interaction.reply(`The temporary channel lobby has been set to **${channel.name}**.`);
        } catch (error) {
            console.error('Error setting temp channel:', error);
            await interaction.reply({ content: 'There was an error while setting the temporary channel. Please try again later.', ephemeral: true });
        }
    },
};