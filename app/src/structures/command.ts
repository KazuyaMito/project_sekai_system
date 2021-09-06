import { Message } from "discord.js";

export class Command
{
    client: any
    name: string;
    args: boolean;
    disable: boolean;
    message: Message | undefined

    constructor(client: any, options: { name: string, args: boolean, disable: boolean })
    {
        this.client = client;
        this.name = options.name;
        this.args = options.args;
        this.disable = options.disable;
    }

    setMessage(message: Message)
    {
        this.message = message;
    }
}