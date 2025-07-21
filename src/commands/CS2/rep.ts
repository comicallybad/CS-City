import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import axios from "axios";
import { sendReply } from "../../utils/replyUtils";
import { ValidationError } from "../../utils/customErrors";

interface ReputationData {
    rate: number;
    trade_position: number;
    body: string;
}

interface ReputationResponse {
    data: ReputationData[];
}

interface SteamProfile {
    steamid: string;
    profileurl: string;
    timecreated: number;
    personaname: string;
    avatarfull: string;
}

interface BanStatus {
    ban: boolean;
}

interface SteamResolveVanityURLResponse {
    response: {
        steamid?: string;
        success: number;
        message?: string;
    };
}

interface SteamPlayerSummariesResponse {
    response: {
        players: SteamProfile[];
    };
}

interface SteamPlayerLevelResponse {
    response: {
        player_level: number;
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName("rep")
        .setDescription("View a steam accounts csgo-rep.com reputation.")
        .addSubcommand(subcommand => subcommand.setName("view").setDescription("View a steam accounts csgo-rep.com reputation.")
            .addStringOption(option => option.setName("steam").setDescription("The Steam ID, Vanity URL, or Trade URL of the account to view.").setRequired(true))),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const input = interaction.options.getString("steam");
        if (!input) {
            throw new ValidationError("Steam ID, Vanity URL, or Trade URL is required.");
        }

        try {
            const steamID = await getSteamID(input);
            const [steam, steamLevel, checkBan, reputation] = await Promise.all([
                getSteamProfile(steamID),
                getSteamLevel(steamID),
                getBanStatus(steamID),
                getReputation(steamID)
            ]);

            const embed = buildReputationEmbed(steam, steamLevel, checkBan, reputation, steamID, interaction);

            return sendReply(interaction, { embeds: [embed] });
        } catch (error) {
            if (error instanceof ValidationError) {
                await sendReply(interaction, { content: error.message, flags: MessageFlags.Ephemeral });
            } else {
                throw error;
            }
        }
    }
};

/**
 * Builds the EmbedBuilder for the reputation command.
 * @param steam The Steam profile data.
 * @param steamLevel The Steam level.
 * @param checkBan The ban status.
 * @param reputation The reputation data.
 * @param steamID The Steam ID.
 * @param interaction The ChatInputCommandInteraction.
 * @returns The constructed EmbedBuilder.
 */
function buildReputationEmbed(
    steam: SteamProfile,
    steamLevel: number,
    checkBan: BanStatus,
    reputation: ReputationResponse,
    steamID: string,
    interaction: ChatInputCommandInteraction
): EmbedBuilder {
    const positiveReps = reputation?.data?.filter(rep => rep.rate === 1).length || 0;
    const neutralReps = reputation?.data?.filter(rep => rep.rate === 0).length || 0;

    const embed = new EmbedBuilder()
        .addFields(
            { name: "__**Steam ID**__", value: `[${steam.steamid}](${steam.profileurl})`, inline: true },
            { name: "__**Created**__", value: `<t:${steam.timecreated}:f>`, inline: true },
            { name: "__**Steam Level**__", value: `${steamLevel}`, inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag} | ${interaction.user.id}`, iconURL: interaction.user.avatarURL() ?? undefined })
        .setTimestamp();

    if (checkBan && checkBan.ban) {
        embed.setAuthor({ name: `${steam.personaname} (BANNED)`, iconURL: `${steam.avatarfull}` })
            .setColor("#FF0000")
            .addFields(
                { name: "__**Overview**__", value: `**N/A**\n\n[**View Profile**](https://csgo-rep.com/profile/${steamID})` }
            ).addFields(
                { name: "__**Recent Reputations**__", value: "This user has been banned from the rep service" }
            );
    } else {
        embed.setAuthor({ name: `${steam.personaname}`, iconURL: `${steam.avatarfull}` })
            .setColor("#00FF00")
            .addFields({
                name: "__**Overview**__",
                value: `Positive: **+${positiveReps}** | Neutral: **-${neutralReps}**\n
                [**View Profile**](https://csgo-rep.com/profile/${steamID})
                [**Add Feedback**](https://csgo-rep.com/feedback/${steamID})`
            });

        if (reputation?.data?.length > 0) {
            embed.addFields(
                { name: "Recent Reputations", value: formatRecentReputations(reputation.data) }
            );
        } else {
            embed.setColor("#0EFEFE")
                .addFields(
                    { name: "__**Recent Reputations**__", value: "This user has no reputations." }
                );
        }
    }
    return embed;
}

/**
 * Formats the recent reputations into a string for the embed.
 * @param reputations The array of ReputationData.
 * @returns The formatted string.
 */
function formatRecentReputations(reputations: ReputationData[]): string {
    return "```diff\n" +
        reputations.slice(0, 5).map(rep => {
            let position = '';
            if (rep.trade_position === 1) {
                position = ' (1st)';
            } else if (rep.trade_position === 2) {
                position = ' (2nd)';
            }
            return `${rep.rate === 1 ? "+" : "-"}${position} ${rep.body}`;
        }).join("\n") + "\n```";
}

async function getSteamID(input: string): Promise<string> {
    if (input.match(/^\d+$/)) {
        return input;
    } if (input.includes("steamcommunity.com/profiles/")) {
        return input.replace(/\D/g, '');
    } else if (input.includes("steamcommunity.com/id/")) {
        const vanityURL = getSteamIDFromVanity(input);
        if (!process.env.STEAM) {
            throw new ValidationError("STEAM environment variable is not set.");
        }
        const res = await axios.get<SteamResolveVanityURLResponse>(
            `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM}&vanityurl=${vanityURL}`
        );

        if (!res || !res.data || !res.data.response || res.data.response.success !== 1 || !res.data.response.steamid) {
            throw new ValidationError(`Failed to resolve vanity URL: ${vanityURL}`);
        }
        return res.data.response.steamid;
    } else if (input.includes("steamcommunity.com/tradeoffer/new/?partner=")) {
        const tradeUrl = input;
        const accountId = new URL(tradeUrl).searchParams.get('partner');
        if (!accountId) {
            throw new ValidationError("Invalid Trade URL: Could not extract partner ID.");
        }
        const universe = BigInt(1);
        const type = BigInt(1);
        const instance = BigInt(1);

        const steamID64 = (universe << BigInt(56)) | (type << BigInt(52)) | (instance << BigInt(32)) | BigInt(accountId);
        return steamID64.toString();
    } else {
        throw new ValidationError("Invalid Steam ID, Vanity URL, or Trade URL provided.");
    }
}

function getSteamIDFromVanity(url: string): string {
    const parsedUrl = new URL(url, 'https://steamcommunity.com');
    const pathParts = parsedUrl.pathname.split('/');

    if (pathParts[1] === 'id' && pathParts[2])
        return pathParts[2];

    throw new ValidationError("Invalid Vanity URL format.");
}

async function getSteamProfile(steamID: string): Promise<SteamProfile> {
    if (!process.env.STEAM) {
        throw new ValidationError("STEAM environment variable is not set.");
    }
    const res = await axios.get<SteamPlayerSummariesResponse>(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM}&steamids=${steamID}`
    );
    if (!res.data.response.players || res.data.response.players.length === 0) {
        throw new ValidationError("Could not retrieve Steam profile data.");
    }
    return res.data.response.players[0];
}

async function getSteamLevel(steamID: string): Promise<number> {
    if (!process.env.STEAM) {
        throw new ValidationError("STEAM environment variable is not set.");
    }
    const res = await axios.get<SteamPlayerLevelResponse>(
        `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${process.env.STEAM}&steamid=${steamID}`
    );
    if (!res.data.response || res.data.response.player_level === undefined) {
        throw new ValidationError("Could not retrieve Steam level data.");
    }
    return res.data.response.player_level;
}

async function getBanStatus(steamID: string): Promise<BanStatus> {
    try {
        const response = await axios.post<BanStatus>('https://api.csgo-rep.com/', {
            id: "206",
            query: {
                steam_id: `${steamID}`
            }
        });
        return response.data;
    } catch (error) {
        throw new ValidationError("Could not retrieve ban status data.");
    }
}

async function getReputation(steamID: string): Promise<ReputationResponse> {
    try {
        const response = await axios.post<ReputationResponse>('https://api.csgo-rep.com/', {
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
        throw new ValidationError("Could not retrieve reputation data.");
    }
}