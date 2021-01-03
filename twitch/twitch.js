const TwitchBot = require("twitch-bot");
const config = require("../config.json");

const Bot = new TwitchBot({
    username: config.twitchbot.username,
    oauth: config.twitchbot.oauth,
    channels: config.twitchbot.channels
})

Bot.on('join', channel => {
    console.log(channel, typeof(channel));
});

Bot.on('error', console.error);

Bot.on('message', chatter => {
    if (chatter.message === "!test") {
        Bot.say("Command executed! PogChamp");
    }
});