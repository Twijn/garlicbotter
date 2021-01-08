const con = require('../../internal/database');

const command = {
    name: 'createsidecategory'
    , description: 'Create a side category holder'
    , usage: `createsidecategory`
    , permission: 'MANAGE_CHANNELS'
    , execute(message, args) {
        let permissions = [
            {
                id: message.client.user, // Client user (this bot)
                allow: ['VIEW_CHANNEL']
            },
            {
                id: message.guild.roles.cache.find(role => role.name === "@everyone"), // @everyone role (everyone)
                deny: ['VIEW_CHANNEL'],
            }
        ];

        con.query("select id, side_view from roles where guild_id = ? and (side_view = true or side_history = true);", [message.guild.id], (err, roles) => {
            if (err) {console.log(err);return;};

            roles.forEach(role => {
                if (role.side_view == 1) {
                    permissions = [
                        ...permissions,
                        {
                            id: role.id,
                            allow: ['VIEW_CHANNEL'],
                        }
                    ]
                }
            });

            message.guild.channels.create("Side Channels", {
                type: "category",
                permissionOverwrites: permissions
            }).then(channel => {
                con.query("update channels set unused_mute_category = false where guild_id = ?;", [channel.guild.id], err => {
                    if (err) console.error(err);
                    con.query("insert into channels (id, guild_id, unused_mute_category) values (?, ?, true);", [channel.id, channel.guild.id], err => {if (err) console.error(err);});
                });

                message.reply("Side channel category was created!");
            }).catch(console.error);
        });
    }
};

module.exports = command;