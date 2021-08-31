import { Client, Intents } from "discord.js";
import { config } from "./config";
// import { Database } from "./modules/control_db";

const options = {
    intents: Intents.FLAGS.GUILDS | Intents.FLAGS.GUILD_MESSAGES | Intents.FLAGS.GUILD_VOICE_STATES
}
const client = new Client(options);

client.on('ready', () => {
    console.log(`Logged in as ${client.user!.tag}`);
    client.user?.setActivity('&help');
});

// client.on('messageCreate', async message => {
// })

client.login(config.token);