const { EmbedBuilder } = require('discord.js');
const { s } = require('../../../utils/functions/functions.js');

module.exports = async (client, messages) => {
    const logChannel = messages.first().guild.channels.cache.find(channel => channel.name.includes("text-logs"));
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`Messages Deleted`)
        .setDescription(`${messages.map(message => `${message.author}: ${message.content}`).join('\n')}`)
        .setTimestamp();

    return s(logChannel, "", embed);
}