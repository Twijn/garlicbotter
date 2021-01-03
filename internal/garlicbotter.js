const con = require("./database");

class Channel {
    constructor(discord, guild, sideId, parentId) {
        this.discord = discord;
        this.guild = guild;
        this.sideId = sideId;
        this.parentId = parentId;
    }

    async side() {
        if (this.sideId === null) return null;
        return await this.guild.channel(this.sideId);
    }

    async parent() {
        if (this.parentId === null) return null;
        return await this.guild.channel(this.parentId);
    }
}

class Guild {
    constructor(discord) {
        this.discord = discord;
    }

    channel(id, channel = null) {
        return new Promise(async (resolve, reject) => {
            if (channel === null) {
                channel = await this.discord.channels.resolve(id);

                if (channel === null || channel === undefined) {
                    reject("Could not resolve discord channel object");
                    return;
                }
            }

            // try
            con.query("select * from channels where id = ?;", [channel.id], async (err, result) => {
                if (err) {reject(err);return;}

                if (result !== undefined && result !== null && result.length > 0) {
                    // we good, send it.
                    let channelRes = result[0];
                    resolve(new Channel(channel, this, channelRes.side, channelRes.parent));
                } else {
                    // add
                    con.query("insert into channels (id, guild_id) values (?, ?);", [channel.id, this.discord.id], err => {
                        if (err) {reject(err);return;}
                        // retry
                        con.query("select * from channels where id = ?;", [channel.id], (err, result) => {
                            if (err) {reject(err);return;}
            
                            if (result !== undefined && result !== null && result.length > 0) {
                                let channelRes = result[0];
                                resolve(new Channel(channel, this, channelRes.side, channelRes.parent));
                            } else {
                                reject("Failed to add guild into database. This is awkward");
                            }
                        });
                    });
                }
            });
        });
    }
}

class Manager {
    constructor(client) {
        this.client = client;
    }

    guild(id, guild = null) {
        return new Promise(async (resolve, reject) => {
            if (guild === null) {
                guild = await this.client.guilds.fetch(id);

                if (guild === null || guild === undefined) {
                    reject("Could not resolve discord guild object");
                    return;
                }
            }

            // try
            con.query("select * from guilds where id = ?;", [guild.id], async (err, result) => {
                if (err) {reject(err);return;}

                if (result !== undefined && result !== null && result.length > 0) {
                    // we good, send it.
                    let guildRes = result[0];
                    resolve(new Guild(guild));
                } else {
                    // add
                    con.query("insert into guilds (id) values (?);", [guild.id], err => {
                        if (err) {reject(err);return;}
                        // retry
                        con.query("select * from guilds where id = ?;", [guild.id], (err, result) => {
                            if (err) {reject(err);return;}
            
                            if (result !== undefined && result !== null && result.length > 0) {
                                let guildRes = result[0];
                                resolve(new Guild(guild));
                            } else {
                                reject("Failed to add guild into database. This is awkward");
                            }
                        });
                    });
                }
            });
        });
    }
}

module.exports = {
    Guild: Guild,
    Manager: Manager,
};