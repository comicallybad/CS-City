module.exports = (client, oldMember, newMember) => {
    if (oldMember.premiumSince !== newMember.premiumSince) {
        newMember.roles.cache.forEach(async r => {
            if (r.members.size <= 1)
                await r.delete().catch(err => err);
        });
    }
}