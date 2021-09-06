//@ts-ignore
import { TextChannel, TextBasedChannel, Message, Snowflake, Guild, MessageEmbed } from 'discord.js';
//@ts-ignore
import { joinVoiceChannel, entersState, VoiceConnection, VoiceConnectionStatus, createAudioPlayer, AudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType } from '@discordjs/voice'
import { Command } from '../structures/command';
import { TTS } from "../modules/tts"
const tts:TTS = new TTS;
//export
module.exports = class TTSCommand extends Command{

    constructor(client: any){
        super(client,{
            name:"tts",//コマンド名
            args:true,//引数
            disable:false//停止
        });
    }

//@ts-ignore
    public async run(message: Message,args: string){
        switch(args[0]){
            case "join":
                if(message.member?.voice.channel){
                    if(typeof message.member.voice.channel.id === "string" && message.channel instanceof TextChannel){
                    const connection:any = await tts.connectToChannel(message.member.voice.channel.id,message.channel);
                    message.channel.send({embeds:[new MessageEmbed().setAuthor(this.client.user.tag,this.client.user.defaultAvatarURL).setColor("GREEN").setTitle("接続完了").setDescription("読み上げを開始します。読み上げを終了したい場合は、 `&tts end` と入力してください").addField("読み上げ対象",`<#${message.channel.id}>`).addField("ボイスチャンネル",`<#${connection.joinConfig.channelId}>`,true)]})
                    }
                }else{
                    message.channel.send({embeds:[new MessageEmbed().setAuthor(this.client.user.tag,this.client.user.defaultAvatarURL).setDescription("ボイスチャンネルに接続してください。").setColor("RED")]})
                }
                break;
        }
    }
}
