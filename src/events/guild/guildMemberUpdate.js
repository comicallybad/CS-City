const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { s } = require("../../../utils/functions/functions.js");

module.exports = async (client, oldMember, newMember) => {
    if (oldMember.premiumSince === newMember.premiumSince) return;
    if (newMember.roles.cache.find(role => role.name.includes("Booster"))) return;
    const logChannel = newMember.guild.channels.cache.find(channel => channel.name.includes("role-logs"));
    const fetchedLogs = await newMember.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleCreate,
        user: newMember.guild.members.me,
    });

    const roleLogs = fetchedLogs.entries.map(role => role.target.id)
    const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Server Booster Role Deleted")
        .setThumbnail(newMember.user.displayAvatarURL())
        .setFooter({
            text: `${newMember.user.tag} | ${newMember.user.id}`,
            iconURL: newMember.user.displayAvatarURL()
        })
        .setTimestamp()

    newMember.roles.cache.forEach(async r => {
        if (!roleLogs.includes(r.id)) return;

        embed.setFields({
            name: "__**Member**__",
            value: `${newMember.user}`,
            inline: true
        }, {
            name: "__**Role ID**__",
            value: `${r.id}`,
            inline: true
        }, {
            name: "__**Role Name**__",
            value: `${r.name}`,
            inline: true
        })

        if (logChannel) s(logChannel, "", embed)
        await r.delete().catch(err => err);
    });
}