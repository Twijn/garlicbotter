const GB = require("../../internal/garlicbotter");
const con = require('../../internal/database');

let client = null;

const updateChannelPermissions = channel => {
    const Manager = new GB.Manager(client);

    Manager.guild(channel.guild.id, channel.guild).then(gbguild => {
        gbguild.channel(channel.id, channel).then(gbChannel => {
            if (gbChannel.create_side) {
                gbChannel.side().then(sideChannel => {
                    let permissions = [
                        {
                            id: client.user, // Client user (this bot)
                            allow: ['VIEW_CHANNEL']
                        },
                        {
                            id: channel.guild.roles.cache.find(role => role.name === "@everyone"), // @everyone role (everyone)
                            deny: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
                        }
                    ];

                    con.query("select id, side_view, side_history from roles where guild_id = ? and (side_view = true or side_history = true);", [gbguild.discord.id], (err, roles) => {
                        if (err) {console.log(err);return;};

                        roles.forEach(role => {
                            let allows = [];

                            if (role.side_view == 1) allows = [...allows, "VIEW_CHANNEL"];
                            if (role.side_history == 1)  allows = [...allows, "READ_MESSAGE_HISTORY"];

                            permissions = [
                                {
                                    id: role.id,
                                    allow: allows,
                                },
                                ...permissions
                            ];
                        });

                        channel.members.each(member => {
                            permissions = [
                                {
                                    id: member,
                                    allow: ['VIEW_CHANNEL'],
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

                            if (channel.members.size > 0) {
                                let effSideId = sideChannel.discord.parent !== null ? sideChannel.discord.parent.id : null;
                                let effChnlId = channel.parent !== null ? channel.parent.id : null;
                                if (effSideId !== effChnlId) {
                                    sideChannel.discord.setParent(channel.parent, {lockPermissions: false}).catch(console.error);
                                }
                            }
                        }
                        
                        if (channel.members.size === 0) {
                            con.query("select id from channels where unused_mute_category = true and guild_id = ?;", [channel.guild.id], (err, umcData) => {
                                if (err) {console.error(err);return;}

                                if (umcData.length > 0) {
                                    gbguild.channel(umcData[0].id).then(umCat => {
                                        sideChannel.discord.setParent(umCat.discord, {lockPermissions: false}).catch(console.error);
                                    }).catch(console.error);
                                }
                            });
                        }
                    });
                }).catch(console.error);
            }
        }).catch(console.error);
    }).catch(console.error);
}

module.exports = clt => {
    client = clt;


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
}