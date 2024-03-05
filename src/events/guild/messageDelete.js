const { EmbedBuilder } = require('discord.js');
const { s } = require('../../../utils/functions/functions.js');

module.exports = async (client, message) => {
    if (!message.content || !message.author || !message.guild) return;
    if (message.author.bot) return;

    const target = message.author;
    const logChannel = message.guild.channels.cache.find(channel => channel.name.includes("text-logs"));
    if (!logChannel || !target) return;

    const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Message Deleted")
        .setThumbnail(target.displayAvatarURL())
        .setFooter({ text: `${target.tag} | ${target.id}`, iconURL: target.displayAvatarURL() })
        .setTimestamp()
        .addFields({
            name: "__**User**__",
            value: `${target}`,
            inline: true,
        }, {
            name: "__**Channel**__",
            value: `${message.channel}`,
            inline: true,
        })
        .setDescription(message.content && message.content.length <= 1020 ? message.content : message.content ? message.content.substring(0, 1020) + "`...`" : "No content")

    return s(logChannel, "", embed);
}