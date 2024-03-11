const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { s, re, delr } = require("../../../utils/functions/functions.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("role")
        .setDescription("SERVER BOOSTERS - Create your own role.")
        .addStringOption(option => option.setName("name").setDescription("The name of the role.").setMinLength(1).setMaxLength(64).setRequired(true))
        .addStringOption(option => option.setName("color").setDescription("The hex color of the role.").setRequired(true))
        .addStringOption(option => option.setName("emoji").setDescription("The unicode emoji of the role.")),
    execute: async (interaction) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles) && !interaction.member.roles.cache.find(role => role.name.includes("Server Booster")))
            return re(interaction, "You don't have permission to manage roles.").then(() => delr(interaction, 15000));

        const name = interaction.options.getString("name");
        const color = interaction.options.getString("color");
        const emoji = interaction.options.getString("emoji") || undefined;
        const logChannel = interaction.guild.channels.cache.find(channel => channel.name.includes("role-logs"));

        if (!color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/))
            return re(interaction, "Invalid hex color.").then(() => delr(interaction, 15000));

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
                if (emoji) await role.setUnicodeEmoji(emoji);

                interaction.member.roles.cache.forEach(async r => {
                    if (r.members.size <= 1)
                        await r.delete().catch(err => err)
                });

                await interaction.member.roles.add(role);

                const embed = new EmbedBuilder()
                    .setColor("#00FF00")
                    .setTitle("Server Booster Role Created")
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setFooter({
                        text: `${interaction.user.tag} | ${interaction.user.id}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .addFields({
                        name: "__**Member**__",
                        value: `${interaction.user}`,
                        inline: true
                    }, {
                        name: "__**Role**__",
                        value: `${role}`,
                        inline: true
                    }, {
                        name: "__**Color**__",
                        value: `${color}`,
                        inline: true
                    }, {
                        name: "__**Emoji**__",
                        value: `${emoji || "None"}`,
                        inline: true
                    })
                    .setTimestamp()

                if (logChannel) s(logChannel, "", embed)
                return re(interaction, `Role ${role} has been created.`).then(() => delr(interaction, 15000));
            } catch (err) {
                await role.delete();
                return re(interaction, `An error occurred while creating the role:\n\`${err}\``).then(() => delr(interaction, 15000));
            }
        } catch (err) {
            return re(interaction, `An error occurred while creating the role:\n\`${err}\``).then(() => delr(interaction, 15000));
        }
    }
}