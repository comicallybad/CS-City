const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require("discord.js");
const { s, re, er, delr } = require("../../../utils/functions/functions.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("role")
        .setDescription("SERVER BOOSTERS - Create your own role.")
        .addStringOption(option => option.setName("name").setDescription("The name of the role.").setMinLength(1).setMaxLength(64).setRequired(true))
        .addStringOption(option => option.setName("color").setDescription("The hex color of the role.").setRequired(true))
        .addStringOption(option => option.setName("icon").setDescription("The emoji/icon url of the role.")),
    execute: async (interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles) && !interaction.member.roles.cache.find(role => role.name.includes("Server Booster")))
            return re(interaction, "You don't have permission to manage roles.").then(() => delr(interaction, 15000));

        const name = interaction.options.getString("name");
        const color = interaction.options.getString("color");
        const icon = interaction.options.getString("icon") || undefined;
        const logChannel = interaction.guild.channels.cache.find(channel => channel.name.includes("role-logs"));

        if (!color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/))
            return re(interaction, "Invalid hex color.").then(() => delr(interaction, 15000));

        await re(interaction, "Creating your role, please wait...");

        try {
            const role = await interaction.guild.roles.create({
                name: name,
                color: color,
                permissions: [],
                mentionable: false,
                hoist: false,
                position: interaction.guild.roles.cache.find(role => role.id === "1172713390683205642").position - 1,
                reason: `Server Booster role created by ${interaction.user.tag} | ${interaction.user.id}.`
            });

            if (!role)
                return re(interaction, "An error occurred while creating the role.").then(() => delr(interaction, 15000));

            try {
                if (icon) {
                    const iconRegex = /<a?:\w+:(\d+)>/;
                    const urlRegex = /(https?:\/\/.*\.(?:png|jpg|gif))/i;
                    const match = icon.match(iconRegex);
                    const urlMatch = icon.match(urlRegex);
                    const iconId = match ? match[1] : icon;

                    if (urlMatch) {
                        await role.setIcon(urlMatch[0]);
                    } else {
                        const fetchEmoji = interaction.guild.emojis.cache.find(e => e.name === icon || e.id === iconId);

                        if (fetchEmoji) {
                            if (!fetchEmoji.animated) {
                                await role.setIcon(`https://cdn.discordapp.com/emojis/${fetchEmoji.id}.png`);
                            } else {
                                await role.setIcon(`https://cdn.discordapp.com/emojis/${fetchEmoji.id}.gif`);
                            }
                        } else {
                            throw new Error("Invalid emoji or icon URL");
                        }
                    }
                }

                const fetchedLogs = await interaction.guild.fetchAuditLogs({
                    type: AuditLogEvent.RoleCreate,
                    user: interaction.guild.members.me,
                });

                const roleLogs = fetchedLogs.entries.map(role => role.target.id)
                const embed = new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("Server Booster Role Deleted")
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setFooter({
                        text: `${interaction.user.tag} | ${interaction.user.id}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp()

                interaction.member.roles.cache.forEach(async r => {
                    if (!roleLogs.includes(r.id)) return;

                    embed.setFields({
                        name: "__**Member**__",
                        value: `${interaction.user}`,
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

                await interaction.member.roles.add(role);

                embed
                    .setColor("#00FF00")
                    .setTitle("Server Booster Role Created")
                    .setFields({
                        name: "__**Member**__",
                        value: `${interaction.user}`,
                        inline: true
                    }, {
                        name: "__**Role**__",
                        value: `${role}`,
                        inline: true
                    }, {
                        name: "__**Role ID**__",
                        value: `${role.id}`,
                        inline: true
                    }, {
                        name: "__**Role Name**__",
                        value: `${name}`,
                        inline: true
                    }, {
                        name: "__**Color**__",
                        value: `${color}`,
                        inline: true
                    }, {
                        name: "__**Icon**__",
                        value: `${icon || "None"}`,
                        inline: true
                    })

                if (logChannel) s(logChannel, "", embed)
                return er(interaction, `Role ${role} has been created.`).then(() => delr(interaction, 15000));
            } catch (err) {
                await role.delete();
                return er(interaction, `An error occurred while creating the role:\n\`${err}\``).then(() => delr(interaction, 15000));
            }
        } catch (err) {
            return er(interaction, `An error occurred while creating the role:\n\`${err}\``).then(() => delr(interaction, 15000));
        }
    }
}