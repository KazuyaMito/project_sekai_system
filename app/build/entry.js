"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var discord_js_1 = require("discord.js");
var config_1 = require("./config");
var options = {
    intents: discord_js_1.Intents.FLAGS.GUILDS | discord_js_1.Intents.FLAGS.GUILD_MESSAGES | discord_js_1.Intents.FLAGS.GUILD_VOICE_STATES
};
var client = new discord_js_1.Client(options);
client.on('ready', function () {
    console.log("Logged in as " + client.user.tag);
});
client.on('messageCreate', function (message) {
    if (message.author.bot)
        return;
    if (message.content === "ping") {
        message.reply("Pong!")
            .catch(console.error);
    }
});
client.login(config_1.config.token);
