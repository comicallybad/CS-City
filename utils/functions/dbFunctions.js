const mongoose = require("mongoose");
const db = require('../schemas/db.js');

module.exports = {
    dbSetup: async function (client) {
        const guilds = client.guilds.cache.map(guild => ({ id: guild.id, name: guild.name }));

        await Promise.all(guilds.map(async guild => {
            const exists = await db.findOne({ guildID: guild.id }).catch(err => err);
            if (!exists) {
                exists = new db({
                    _id: new mongoose.Types.ObjectId(),
                    guildID: guild.id,
                    guildName: guild.name,
                });
            } else {
                exists.guildName = guild.name;
            }
            await exists.save().catch(err => err);
        }));
    },
}