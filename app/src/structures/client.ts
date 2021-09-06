import { Client, Collection } from "discord.js";
import path from "path";
import glob from "glob";
import { Command }  from "./command";
import { config } from "../config";;

export class ProjectSekaiSystem extends Client
{
    commands: Collection<string, Command>;

    constructor(options:any)
    {
        super(options);
        this.commands = new Collection();
    }

    get directory()
    {
        return `${path.dirname(require.main!.filename)}${path.sep}`;
    }

    public escapeRegex(str: string)
    {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    private async loadCommands()
    {
        glob(`${this.directory}/commands/**/*.js`, async (err, files) => {
            if (err) throw new Error(err.message);

            for await (const file of files)
            {
                delete require.cache[`${file}`];
                const command: Command = new (require(file))(this),
                filename: string = file.slice(file.lastIndexOf("/") + 1, file.length - 3);
                this.commands.set(filename, command);
                console.log(`Load: ${file}`);
            }
        });
    }

    public async init()
    {
        this.loadCommands();
        console.log("client initialized")
        this.login(config.token);
    }
}
