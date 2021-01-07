const con = require("./database");

const editRules = {
    CHANNEL: {
        side_listener: {
            values: [true, false],
        },
        create_side: {
            values: [true, false],
        }
    },
    GUILD: {

    },
};

const validate = (values, rules) => {
    let result = [true, []];

    for (const [key, value] of Object.entries(values)) {
        if (rules.hasOwnProperty(key)) {
            let rule = rules[key];
            let number = rule.hasOwnProperty("type") && rule.type === "number";

            if (rule.hasOwnProperty("regex") && !value.match(rule.regex)) {
                result[0] = false;
                result[1].push(`Property \`${key}\` does not match regex: \`${rule.regex}\``);
                continue;
            }

            if (rule.hasOwnProperty("min")) {
                if (number) {
                    if (value < rule.min) {
                        result[0] = false;
                        result[1].push(`Property \`${key}\` must be at least ${rule.min}`);
                        continue;
                    }
                } else {
                    if (value.length < rule.min) {
                        result[0] = false;
                        result[1].push(`Property \`${key}\` requires at least ${rule.min} character${rule.min === 1 ? '' : 's'}`);
                        continue;
                    }
                }
            }

            if (rule.hasOwnProperty("max")) {
                if (number) {
                    if (value > rule.max) {
                        result[0] = false;
                        result[1].push(`Property \`${key}\` must be under or equal to ${rule.max}`);
                        continue;
                    }
                } else {
                    if (value.length > rule.max) {
                        result[0] = false;
                        result[1].push(`Property \`${key}\` must be under or equal to ${rule.max} character${rule.max === 1 ? '' : 's'}`);
                        continue;
                    }
                }
            }

            if (rule.hasOwnProperty("values")) {
                if (!rule.values.includes(value)) {
                    result[0] = false;
                    result[1].push(`Property \`${key}\` must be one of the values: ${rule.values}`);
                    continue;
                }
            }

        } else {
            result[0] = false;
            result[1].push(`Invalid property: \`${key}\``);
        }
    }

    return result;
};

const purgeChannel = id => {
    con.query("update channels set side = null where side = ?;", [id]);
    con.query("update channels set parent = null where parent = ?;", [id]);

    con.query("delete from channels where id = ?;", [id]);
}

class Channel {
    constructor(discord, guild, sideId, parentId, create_side, side_listener) {
        this.discord = discord;
        this.guild = guild;
        this.sideId = sideId;
        this.parentId = parentId;
        this.create_side = create_side;
        this.side_listener = side_listener;
    }

    async side() {
        if (this.sideId === null) return null;
        return await this.guild.channel(this.sideId);
    }

    async parent() {
        if (this.parentId === null) return null;
        return await this.guild.channel(this.parentId);
    }

    edit(data) {
        return new Promise((resolve, reject) => {
            const validation = validate(data, editRules.CHANNEL);
    
            if (validation[0]) {
                let fields = "";
                let updateData = [];

                for (const [key, value] of Object.entries(data)) {
                    if (fields !== "") {
                        fields += ", ";
                    }
                    fields += `${key} = ?`;

                    updateData = [...updateData, value];
                }

                con.query(`update channels set ${fields} where id = ?;`, [...updateData, this.discord.id], err => {
                    if (err) {
                        reject(err);
                    } else {
                        for (const [key, value] of Object.entries(data)) {
                            this[key] = value;
                        }

                        resolve(this);
                    }
                });
            } else {
                reject(`Validation error: ${validation[1]}`);
            }
        });
    }

    delete() {
        return new Promise((resolve, reject) => {
            this.discord.delete().then(() => {
                con.query("delete from channels where id = ?;", [this.discord.id], err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }).catch(reject);
        });   
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
                    purgeChannel(id);
                    return;
                }
            }

            const tryGet = (retry = true) => {
                con.query("select * from channels where id = ?;", [channel.id], async (err, result) => {
                    if (err) {reject(err);return;}
    
                    if (result !== undefined && result !== null && result.length > 0) {
                        // we good, send it.
                        let channelRes = result[0];
                        resolve(new Channel(channel, this, channelRes.side, channelRes.parent, channelRes.create_side == true, channelRes.side_listener == true));
                    } else {
                        if (!retry) {
                            reject("Failed to add guild into database. This is awkward");
                            return;
                        }

                        // add
                        con.query("insert into channels (id, guild_id) values (?, ?);", [channel.id, this.discord.id], err => {
                            if (err) {reject(err);console.error(err);return;}
                            
                            tryGet(false);
                        });
                    }
                });
            }

            tryGet();
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