import { Message } from "discord.js";

export abstract class Command
{
    client: any
    name: string;
    args: boolean;
    disable: boolean;

    constructor(client: any, options: { name: string, args: boolean, disable: boolean })
    {
        this.client = client;
        this.name = options.name;
        this.args = options.args;
        this.disable = options.disable;
    }

    public abstract onMessage(message: Message): Promise<void>;
}