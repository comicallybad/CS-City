import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, InteractionContextType } from "discord.js";
import { sendReply } from "../../utils/replyUtils";

export default {
    data: new SlashCommandBuilder()
        .setName('membercount')
        .setContexts(InteractionContextType.Guild)
        .setDescription('Displays the guild member count.'),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const guild = interaction.guild!;

        const embed = new EmbedBuilder()
            .setTitle(`**Members**`)
            .setColor("#0efefe")
            .setDescription(`${guild.memberCount}`)
            .setTimestamp()

        return sendReply(interaction, { embeds: [embed] });
    }
}