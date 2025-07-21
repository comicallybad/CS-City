import {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AuditLogEvent, type ChatInputCommandInteraction,
    type GuildMember, InteractionContextType, MessageFlags, type ColorResolvable
} from "discord.js";
import { sendReply, deleteReply, deferReply } from "../../utils/replyUtils";
import { PermissionError, ValidationError } from "../../utils/customErrors";
import { getLogChannel } from "../../utils/channelUtils";
import { sendMessage } from "../../utils/messageUtils";

export default {
    data: new SlashCommandBuilder()
        .setName("nitro-role")
        .setDescription("SERVER BOOSTERS - Create your own role.")
        .setContexts(InteractionContextType.Guild)
        .addStringOption(option => option.setName("name").setDescription("The name of the role.").setMinLength(1).setMaxLength(64).setRequired(true))
        .addStringOption(option => option.setName("color").setDescription("The hex color of the role. Example: #FF0000").setRequired(true))
        .addStringOption(option => option.setName("icon").setDescription("The emoji or icon URL of the role.")),
    execute: async (interaction: ChatInputCommandInteraction) => {
        if (!interaction.guild || !interaction.member) {
            throw new ValidationError("This command can only be used in a server.");
        }

        const member = interaction.member as GuildMember;
        if (!member.permissions.has(PermissionFlagsBits.ManageRoles) && !member.roles.cache.some(role => role.name.includes("Server Booster"))) {
            throw new PermissionError("You don't have permission to manage roles or you are not a server booster.");
        }

        const name = interaction.options.getString("name", true);
        const color = interaction.options.getString("color", true);
        const icon = interaction.options.getString("icon");

        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
            throw new ValidationError("Invalid hex color. Example: #FF0000");
        }

        await deferReply(interaction, { flags: MessageFlags.Ephemeral });

        const boosterRolePosition = interaction.guild.roles.cache.find(role => role.id === "1172713390683205642")?.position ?? 1;

        const role = await interaction.guild.roles.create({
            name: name,
            color: color as ColorResolvable,
            permissions: [],
            mentionable: false,
            hoist: false,
            position: boosterRolePosition - 1,
            reason: `Server Booster role created by ${interaction.user.tag} | ${interaction.user.id}.`
        });

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
                        await role.setIcon(fetchEmoji.url);
                    } else {
                        throw new ValidationError("Invalid emoji or icon URL.");
                    }
                }
            }

            const fetchedLogs = await interaction.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleCreate,
                user: interaction.client.user.id,
            });

            const roleLogs = fetchedLogs.entries.map(entry => entry.target?.id);
            const logChannel = getLogChannel(interaction.guild, ["role-logs"]);

            const deleteEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle("Server Booster Role Deleted")
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: `${interaction.user.tag} | ${interaction.user.id}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            for (const r of member.roles.cache.values()) {
                if (roleLogs.includes(r.id)) {
                    deleteEmbed.setFields(
                        { name: "Member", value: `${interaction.user}`, inline: true },
                        { name: "Role ID", value: `\`${r.id}\``, inline: true },
                        { name: "Role Name", value: r.name, inline: true }
                    );
                    if (logChannel) await sendMessage(logChannel, { embeds: [deleteEmbed] });
                    await r.delete().catch(() => { });
                }
            }

            await member.roles.add(role);

            const createEmbed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("Server Booster Role Created")
                .addFields(
                    { name: "Member", value: `${interaction.user}`, inline: true },
                    { name: "Role", value: `${role}`, inline: true },
                    { name: "Role ID", value: `\`${role.id}\``, inline: true },
                    { name: "Role Name", value: name, inline: true },
                    { name: "Color", value: color, inline: true },
                    { name: "Icon", value: icon || "None", inline: true }
                );

            if (logChannel) await sendMessage(logChannel, { embeds: [createEmbed] });

            const replyEmbed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("Success!")
                .setDescription(`Role ${role} has been created.`);

            await sendReply(interaction, { embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
            await deleteReply(interaction, { timeout: 15000 });

        } catch (err) {
            await role.delete().catch(() => { });
            if (err instanceof ValidationError) {
                throw err;
            } else {
                throw new Error(`An error occurred while creating the role: ${err}`);
            }
        }
    }
};
