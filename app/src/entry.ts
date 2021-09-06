import { Intents, Message } from "discord.js";
import { ProjectSekaiSystem } from  "./structures/client";
import { config } from "./config";

const options = {
    intents: Intents.FLAGS.GUILDS | Intents.FLAGS.GUILD_MESSAGES | Intents.FLAGS.GUILD_VOICE_STATES
}
const client = new ProjectSekaiSystem(options);
const prefix: string = config.prefix;

client.on('ready', () => {
    console.log(`Logged in as ${client.user!.tag}`);
    client.user?.setActivity('&help');
});

client.on('messageCreate', async (message:Message) => {
    if (message.author.bot || message.system) return;

    const prefixRegex: RegExp = new RegExp(`^(<@!?${client.user!.id}>|${client.escapeRegex(prefix)})`, "g");
    const isCommand: boolean = prefixRegex.test(message.content);
    if (isCommand)
    {
        const matchedPrefix: any = message.content.match(prefixRegex);
        let content: any = message.content.slice(matchedPrefix.length).split(/[\s]+/gm);
        if (content[0] === "")
        {
            content.shift();
        }

        const [commandPrefix, ...args] = content;
        if (commandPrefix === undefined) return;

        let command: any = client.commands.get(commandPrefix.toLowerCase());
        if (command && ! command.disable)
        {
            command.run(message,args);
        }
    }
    else
    {
        client.commands.forEach(command => {
            command.onMessage(message);
        });
    }
});

client.init();