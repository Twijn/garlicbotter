const fs = require('fs');
const Discord = require("discord.js");
const client = new Discord.Client();
const GB = require("../internal/garlicbotter");

client.commands = new Discord.Collection();

const config = require("../config.json");
const con = require('../internal/database');
const prefix = config.prefix;

const commandFiles = fs.readdirSync('./discord/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log(`Discord bot ready! Logged in as ${client.user.tag}!`);
    console.log(`Bot has started with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
});

// implement commands
client.on('message', async message => {
    message.bot_id = client.user.id;

    // we can't have messages with no guild attached after this point
    if (message.guild === undefined || message.guild === null) return;

    // if the message is sent by a bot, we don't need process this at all.
    if (message.author.bot) return;

    const Manager = new GB.Manager(client);
    Manager.guild(message.guild.id, message.guild).then(gbguild => {
        message.gb = {
            Manager: Manager,
            guild: gbguild,
        };

        // if the message doesn't start with the prefix we don't need to process this as a command.
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        if (!client.commands.has(command)) return;

        let cmd = client.commands.get(command);
        
        if (!cmd.hasOwnProperty("permission") || message.guild.member(message.author.id).hasPermission(cmd.permission)) {
            try {
                cmd.execute(message, args);
            } catch (error) {
                console.error(error);
                message.reply('There was an error trying to execute that command!');
            }
        } else {
            message.reply(`Insufficient permission! You need \`${cmd.permission}\``);
        }
    }).catch(err => {
        console.log("Could not obtain guild. Sad face :(");
        console.log(err);
    });
});

const updateChannelPermissions = channel => {
    const Manager = new GB.Manager(client);

    Manager.guild(channel.guild.id, channel.guild).then(gbguild => {
        gbguild.channel(channel.id, channel).then(gbChannel => {
            if (gbChannel.create_side) {
                if (channel.members.array().length > 0) {
                    gbChannel.side().then(sideChannel => {
                        let permissions = [{id: client.user, allow: ['VIEW_CHANNEL']}, {id: channel.guild.roles.cache.find(role => role.name === "@everyone"), deny: ['VIEW_CHANNEL']}];

                        channel.members.each(member => {
                            permissions = [
                                {
                                    id: member,
                                    allow: ['VIEW_CHANNEL'],
                                    deny: ['READ_MESSAGE_HISTORY'],
                                },
                                ...permissions
                            ];
                        });

                        if (sideChannel === null) {
                            let sideChannelName = channel.name.toLowerCase().replace(/[^ 0-9a-z-]/g, "").replace(/ +/g, "-") + "-side";
                            console.log("Creating side channel " + sideChannelName);
                            channel.guild.channels.create(sideChannelName, {
                                type: "text",
                                parent: channel.parent,
                                permissionOverwrites: permissions,
                            }).then(newSideChannel => {
                                con.query("insert into channels (id, guild_id, parent) values (?, ?, ?);", [newSideChannel.id, channel.guild.id, channel.id], err => {
                                    if (err) {console.error(err);return;}

                                    con.query("update channels set side = ? where id = ?;", [newSideChannel.id, channel.id], err => {
                                        if (err) console.error(err);
                                    });
                                });
                            }).catch(console.error);
                        } else {
                            sideChannel.discord.overwritePermissions(permissions);
                        }
                    }).catch(err => {
                        console.log(err);
                    });
                } else {
                    gbChannel.side().then(sideChannel => {
                        if (sideChannel !== null) {
                            sideChannel.discord.delete();

                            con.query("delete from channels where id = ?;", [sideChannel.discord.id]);
                            con.query("update channels set side = null where side = ?;", [sideChannel.discord.id]);
                        }
                    }).catch(err => {
                        console.log(err);
                    });
                }
            }
        }).catch(console.error);
    }).catch(console.error);
}

client.on("voiceStateUpdate", async (oldState, newState) => {
    if (oldState.channelID !== newState.channelID) {
        let user = newState.guild.member(newState.id);

        let fromChannel = oldState.guild.channels.cache.find(channel => channel.id === oldState.channelID);
        let toChannel = newState.guild.channels.cache.find(channel => channel.id === newState.channelID);

        if (fromChannel !== null && fromChannel !== undefined) {
            updateChannelPermissions(fromChannel);
        }
        if (toChannel !== null && toChannel !== undefined) {
            updateChannelPermissions(toChannel);
        }
    }
});

client.on("channelUpdate", (oldChannel, newChannel) => {
    const Manager = new GB.Manager(client);

    // this is painful to look at.
    if (newChannel.name.toLowerCase() === "allow") {
        Manager.guild(newChannel.guild.id, newChannel.guild).then(guild => {
            guild.channel(newChannel.id).then(channel => {
                channel.edit({create_side: true}).catch(console.error);
                channel.discord.edit({name: oldChannel.name}).catch(console.error);
            }).catch(console.error);
        }).catch(console.error);
    } else if (newChannel.name.toLowerCase() === "disallow") {
        Manager.guild(newChannel.guild.id, newChannel.guild).then(guild => {
            guild.channel(newChannel.id).then(channel => {
                if (channel.parentId !== null) {
                    channel.parent().then(parent => {
                        parent.edit({create_side: false}).catch(console.error);
                    }).catch(console.error);

                    channel.delete().catch(console.error);
                } else {
                    channel.edit({create_side: false}).catch(console.error);
                    channel.discord.edit({name: oldChannel.name}).catch(console.error);

                    if (channel.sideId !== null) {
                        channel.side().then(side => {
                            side.delete().catch(console.error);
                        }).catch(console.error);
                    }
                }
            }).catch(console.error);
        }).catch(console.error);
    }
});

const purgeChannel = id => {
    con.query("update channels set side = null where side = ?;", [id], err => {if (err) console.error(err);});
    con.query("update channels set parent = null where parent = ?;", [id], err => {if (err) console.error(err);});

    con.query("delete from channels where id = ?;", [id], err => {if (err) console.error(err);});
}

client.on("channelDelete", channel => {
    purgeChannel(channel.id);
});

console.log("Logging in...");
client.login(config.token);

module.exports = {client: client};