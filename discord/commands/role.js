const config = require("../../config.json");
const allowedVars = ["side_view", "side_history"];

const command = {
    name: 'role'
    , description: 'Edit role variables'
    , usage: `role <Role @> [Variable] [Value]`
    , permission: 'MANAGE_CHANNELS'
    , execute(message, args) {
        if (args.length > 0) {
            let roleId = args[0].replace("<@&", "").replace(">", "");
            let role = message.guild.roles.cache.find(role => role.id === roleId);
            
            if (role !== undefined) {
                message.gb.guild.role(role.id, role).then(gbrole => {
                    if (args.length > 1) {
                        if (allowedVars.includes(args[1].toLowerCase())) {
                            if (args.length > 2) {
                                let edit = {};
                                let value = args[2];

                                if (typeof(value) === "string" && (value.toLowerCase() === "on" || value.toLowerCase() === "true")) value = true;
                                if (typeof(value) === "string" && (value.toLowerCase() === "off" || value.toLowerCase() === "false")) value = false;

                                edit[args[1].toLowerCase()] = value;
                                gbrole.edit(edit).then(gbroleNew => {
                                    message.reply(`Variable **${args[1].toLowerCase()}** for ${role} was changed to \`${gbroleNew[args[1].toLowerCase()]}\``)
                                }).catch(err => {message.reply(err);console.error(err);});
                            } else {
                                message.reply(`Variable **${args[1].toLowerCase()}** for ${role} has a value of \`${gbrole[args[1].toLowerCase()]}\``)
                            }
                        } else {
                            message.reply("This variable can't be changed or viewed.");
                        }
                    } else {
                        let result = "";

                        allowedVars.forEach(v => {
                            result += `\n${v}: ${gbrole[v]}`;
                        });

                        message.reply(`**Role Variables for ${role}**\`\`\`${result}\`\`\``);
                    }
                }).catch(err => {message.reply(err);console.error(err);});
            } else {
                message.reply("We can't find that role!");
            }
        } else {
            message.reply(`Usage: \`${config.prefix}${command.usage}\``);
        }
    }
};

module.exports = command;