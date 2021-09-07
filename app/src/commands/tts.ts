import { TextChannel, Message, MessageEmbed } from 'discord.js';
import { Command } from '../structures/command';
import { TTS } from "../modules/tts"
import { VoiceConnection } from '@discordjs/voice';
import { Database } from '../modules/database';

const tts = new TTS;
const db = new Database();

module.exports = class TTSCommand extends Command
{
    constructor(client: any)
    {
        super(client, {
            name: "tts",
            args: true,
            disable: false
        });
    }

    public async run(message: Message, args: string)
    {
        switch(args[0])
        {
            case "join":
            case "j":
                this.join(message);
                break;
        }
    }

    public async onMessage(message: Message): Promise<void>
    {
        await tts.onMessage(message);
    }

    private async join(message: Message): Promise<void>
    {
        if (message.member?.voice.channel)
        {
            if (typeof message.member.voice.channel.id === "string" && message.channel instanceof TextChannel)
            {
                const connection: VoiceConnection = await tts.connectToChannel(message.member.voice.channel.id, message.channel);
                const guild = message.guild;

                const guildFromDatabase = await db.getGuild(parseInt(guild!.id, 10));
                if(! guildFromDatabase.valid)
                {
                    db.addGuild(parseInt(guild!.id, 10), guild!.name);
                }

                const embed = new MessageEmbed()
                    .setColor("GREEN")
                    .setTitle("接続完了")
                    .setDescription("読み上げを開始します。読み上げを終了したい場合は、 `&tts end` と入力してください")
                    .addField("読み上げ対象",`<#${message.channel.id}>`)
                    .addField("ボイスチャンネル",`<#${connection.joinConfig.channelId}>`,true);

                message.channel.send({ embeds: [embed] })
            }
        }
        else
        {
            const embed = new MessageEmbed()
            .setDescription("ボイスチャンネルに接続してください。")
            .setColor("RED");

            message.channel.send({ embeds: [embed] })
        }
    }
}
