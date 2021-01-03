const command = {
    name: 'ping'
    , description: 'Ping'
    , usage: `ping`
    , permission: 'MANAGE_CHANNELS'
    , execute(message, args) {
        message.reply("Pong!");
    }
};

module.exports = command;