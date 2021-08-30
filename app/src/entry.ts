import { Client, Intents } from "discord.js";
import { config } from "./config";

const options = {
    intents: Intents.FLAGS.GUILDS | Intents.FLAGS.GUILD_MESSAGES | Intents.FLAGS.GUILD_VOICE_STATES
}
const client = new Client(options);

client.on('ready', () => {
    console.log(`Logged in as ${client.user!.tag}`)
});

client.on('messageCreate', message => {
    if (message.author.bot) return;

    if(message.content === "ping")
    {
        message.reply("Pong!")
            .catch(console.error);
    }
});

client.login(config.token);