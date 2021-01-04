const config = require("../../config.json");

const listeners = [
    [["side", "side_listener", "sidelistener"], "side_listener"],
];

const command = {
    name: 'listener'
    , description: 'Add or remove listener for an event'
    , usage: `listener [Listener Name] [On/Off]`
    , permission: 'MANAGE_CHANNELS'
    , execute(message, args) {
        if (args.length > 0) {console.log(args[0].toLowerCase());
            let listener = listeners.filter(list => list[0].includes(args[0].toLowerCase()));

            if (listener.length > 0) {
                listener = listener[0][1];
            } else {
                listener = null;
            }

            if (listener === undefined || listener === null) {
                message.reply(`Listener type \`${args[0].toLowerCase()}\` does not exist.`);
                return;
            }

            message.gb.guild.channel(message.channel.id, message.channel).then(channel => {
                let newValue = !channel[listener];

                if (args.length > 1) {
                    let val = args[1].toLowerCase();
                    if (val === "on" || val === "true") {
                        newValue = true;
                    } else {
                        newValue = false;
                    }
                }

                let editObj = {};

                editObj[listener] = newValue;

                channel.edit(editObj).then(channel => {
                    message.reply(`Listener value was changed: \`${args[0].toLowerCase()}: ${channel[listener]}\``);
                }).catch(err => {
                    message.reply(err);
                    console.error(err);
                });
            }).catch(err => {
                message.reply(`Error: \`${err}\``);
            });
        } else {
            message.gb.guild.channel(message.channel.id, message.channel).then(channel => {
                let output = "Listeners for this channel: ```";
                listeners.forEach(listener => {
                    let listenerName = listener[1];
                    output += `\n${listener[0][0]}: ${channel[listenerName] ? "on" : "off"}`;
                });
                message.reply(output + "```");
            }).catch(err => {
                message.reply(`Error: \`${err}\``);
            });
        }
    }
};

module.exports = command;