const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { r, re, delr } = require("../../../utils/functions/functions.js");
const axios = require("axios");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rep")
        .setDescription("View a steam accounts csgo-rep.com reputation.")
        .addSubcommand(subcommand => subcommand.setName("view").setDescription("View a steam accounts csgo-rep.com reputation.")
            .addStringOption(option => option.setName("steam").setDescription("The Steam ID, Vanity URL, or Trade URL of the account to view.").setRequired(true))),
    execute: async (interaction) => {
        const input = interaction.options.getString("steam");
        const steamID = await getSteamID(input);

        if (!steamID)
            return re(interaction, "Invalid Steam ID or vanity URL.", null).then(() => delr(interaction, 30000));

        const [steam, steamLevel, checkBan, reputation] = await Promise.all([
            getSteamProfile(steamID),
            getSteamLevel(steamID),
            getBanStatus(steamID),
            getReputation(steamID)
        ]);

        if (!steam)
            return re(interaction, "Invalid Steam ID or vanity URL.", null).then(() => delr(interaction, 30000));

        const positiveReps = reputation.data.filter(rep => rep.rate === 1).length;
        const neuutralReps = reputation.data.filter(rep => rep.rate === 0).length;
        const embed = new EmbedBuilder()
            .addFields({
                name: "__**Steam ID**__",
                value: `[${steam.steamid}](${steam.profileurl})`,
                inline: true
            }, {
                name: "__**Created**__",
                value: `<t:${steam.timecreated}:f>`,
                inline: true
            }, {
                name: "__**Steam Level**__",
                value: `${steamLevel}`,
                inline: true
            })
            .setFooter({ text: `Requested by ${interaction.user.tag} | ${interaction.user.id}`, iconURL: interaction.user.avatarURL() })
            .setTimestamp();

        if (checkBan && checkBan.ban) {
            embed.setAuthor({ name: `${steam.personaname} (BANNED)`, iconURL: `${steam.avatarfull}` })
                .setColor("#FF0000")
                .addFields({
                    name: "__**Overview**__",
                    value: `**N/A**\n\n[**View Profile**](https://csgo-rep.com/profile/${steamID})`
                }).addFields({
                    name: "__**Recent Reputations**__",
                    value: "This user has been banned from the rep service"
                })
        } else {
            embed.setAuthor({ name: `${steam.personaname}`, iconURL: `${steam.avatarfull}` })
                .setColor("#00FF00")
                .addFields({
                    name: "__**Overview**__",
                    value: `Positive: **+${positiveReps}** | Neutral: **-${neuutralReps}**\n\n[**View Profile**](https://csgo-rep.com/profile/${steamID})\n[**Add Feedback**](https://csgo-rep.com/feedback/${steamID})`,
                })
            if (reputation.data.length > 0) {
                embed.addFields({
                    name: "Recent Reputations",
                    value: `\`\`\`diff\n${reputation.data.slice(0, 5).map(rep => {
                        let position = '';
                        if (rep.trade_position === 1) {
                            position = ' (1st)';
                        } else if (rep.trade_position === 2) {
                            position = ' (2nd)';
                        }
                        return `${rep.rate === 1 ? "+" : "-"}${position} ${rep.body}`;
                    }).join("\n")}\`\`\``
                })
            } else {
                embed.setColor("#0EFEFE")
                    .addFields({
                        name: "__**Recent Reputations**__",
                        value: "This user has no reputations."
                    })
            }
        }

        return r(interaction, "", embed);
    }
}

async function getSteamID(input) {
    if (input.match(/^\d+$/)) {
        return input;
    } if (input.includes("steamcommunity.com/profiles/")) {
        return input.replace(/\D/g, '');
    } else if (input.includes("steamcommunity.com/id/")) {
        const vanityURL = getSteamIDFromVanity(input);
        const res = await axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM}&vanityurl=${vanityURL}`)
        if (res.data.response.steamid)
            return res.data.response.steamid;
        else return null;
    } else if (input.includes("steamcommunity.com/tradeoffer/new/?partner=")) {
        const tradeUrl = input;
        const accountId = new URL(tradeUrl).searchParams.get('partner');
        const universe = BigInt(1);
        const type = BigInt(1);
        const instance = BigInt(1);

        const steamID64 = (universe << BigInt(56)) | (type << BigInt(52)) | (instance << BigInt(32)) | BigInt(accountId);
        return steamID64.toString();
    } else return null;
}

function getSteamIDFromVanity(url) {
    const parsedUrl = new URL(url, 'https://steamcommunity.com');
    const pathParts = parsedUrl.pathname.split('/');

    if (pathParts[1] === 'id' && pathParts[2])
        return pathParts[2];

    return null;
}

async function getSteamProfile(steamID) {
    const res = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM}&steamids=${steamID}`);
    return res.data.response.players[0];
}

async function getSteamLevel(steamID) {
    const res = await axios.get(`https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${process.env.STEAM}&steamid=${steamID}`);
    return res.data.response.player_level;
}

async function getBanStatus(steamID) {
    try {
        const response = await axios.post('https://api.csgo-rep.com/', {
            id: "206",
            query: {
                steam_id: `${steamID}`
            }
        });
        return response.data;
    } catch (error) {
        return null;
    }
}

async function getReputation(steamID) {
    try {
        const response = await axios.post('https://api.csgo-rep.com/', {
            id: "204",
            query: {
                filter: {
                    to_steam_id: `${steamID}`
                },
                view: "creator",
                offset: 0,
                limit: 1000,
                nulls_last: 1,
                order_by: [
                    {
                        field: "id",
                        order: "DESC"
                    }
                ]
            }
        });
        return response.data;
    } catch (error) {
        return null;
    }
}