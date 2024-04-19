const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { r } = require("../../../utils/functions/functions.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('Displays the guild member count.'),
    execute: (interaction) => {
        const embed = new EmbedBuilder()
            .setTitle(`**Members**`)
            .setColor("#0efefe")
            .setDescription(`${interaction.guild.memberCount}`)
            .setTimestamp()

        return r(interaction, "", embed);
    }
}