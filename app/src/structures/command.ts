const {  Message } = require("discord.js");

export class Command {
    client:any
    name: string;
    args: boolean;
    disable: boolean;
    message: typeof Message
    constructor(client:any, options: {name: string, args: boolean, disable: boolean}){
        this.client = client;
        this.name = options.name;
        this.args = options.args;
        this.disable = options.disable;
    }

    setMessage(message:typeof Message){
        this.message = message;
    }
}