import { TextChannel, Message, MessageEmbed, Collection, Snowflake } from 'discord.js';
import { Command } from '../structures/command';
import { createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { Database } from '../modules/database';
import { jtalk } from '../modules/jtalk';
import { MessageParser } from '../modules/messageParser';
import { TTSGuild } from '../structures/ttsGuild';

const db = new Database();

module.exports = class TTSCommand extends Command
{
    ttsGuilds: Collection<string, TTSGuild>;

    constructor(client: any)
    {
        super(client, {
            name: "tts",
            args: true,
            disable: false
        });

        this.ttsGuilds = new Collection<string, TTSGuild>();
    }

    public async run(message: Message, args: string)
    {
        switch(args[0])
        {
            case "join":
            case "j":
                this.join(message);
                break;

            case "end":
            case "e":
                this.end(message);
                break;
        }
    }

    public async onMessage(message: Message): Promise<void>
    {
        if (message === null || message.author.bot || message.guild === null || message.content.startsWith('&') || message.content.startsWith(';'))
        return;

        const guildId: Snowflake = message.guild.id;
        const ttsGuild = this.ttsGuilds.get(guildId);
        if (! ttsGuild) return;

        const textChannel = ttsGuild._textChannel;

        if (textChannel && message.channel.id === textChannel.id)
        {
            const db = new Database();
            const guildObject = await db.getGuild(parseInt(guildId, 10));

            let msg = MessageParser.omitTheURL(message.content);
            if (guildObject.valid && guildObject.guild!.is_multi_line_read)
            {
                msg = MessageParser.removeLineBreak(msg);
            }

            if (guildObject.valid && guildObject.guild!.is_name_read)
            {
                msg = MessageParser.addUserName(msg, message.member!.displayName);
            }

            msg = MessageParser.parseDiscordReaction(msg);

            const userMentions = message.content.match(/<(?:@\!|@)[0-9]+>/g);
            if (userMentions != null)
            {
                msg = MessageParser.parseUserMentions(msg, userMentions, message.guild);
            }

            const channelMentions = msg.match(/<#[0-9]+>/g);
            if (channelMentions != null)
            {
                msg = MessageParser.parseChannelMentions(msg, channelMentions, message.guild);
            }

            const roleMentions = msg.match(/<@&[0-9]+>/g);
            if (roleMentions != null)
            {
                msg = MessageParser.parseRoleMentions(msg, roleMentions, message.guild);
            }

            // 単語登録処理
            const dictionaryObject = await db.getDictionaries(parseInt(guildId, 10));
            if (dictionaryObject.valid)
            {
                dictionaryObject.dictionaries!.forEach(dictionary => {
                    msg = msg.replace(dictionary.word, dictionary.read);
                });
            }

            // 文字数制限
            if (guildObject.valid)
            {
                const readLimit = guildObject.guild!.read_limit;
                if (readLimit < 0) msg = msg.substr(0, readLimit);
            }

            ttsGuild.message = msg;

            while (ttsGuild.currentMessage !== msg || ttsGuild.isPlaying)
            {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const queuedMessage = ttsGuild.message;
            console.log(`nextMessage: ${queuedMessage}`);
            if(queuedMessage !== "")
            {
                const rawFileName: string = jtalk(queuedMessage);
                const resource = createAudioResource(rawFileName, { inputType: StreamType.Arbitrary });
                ttsGuild.playAudio(resource);
            }
        }
    }

    private async join(message: Message): Promise<void>
    {
        if (message.member?.voice.channel)
        {
            if (typeof message.member.voice.channel.id === "string" && message.channel instanceof TextChannel)
            {
                const connection: VoiceConnection = await this.connectToChannel(message.member.voice.channel.id, message.channel);
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

    private async end(message: Message)
    {
        const guildId: string = message.guild!.id;
        const ttsGuild = this.ttsGuilds.get(guildId);

        if (ttsGuild)
        {
            ttsGuild.destroy();
            this.ttsGuilds.delete(guildId);

            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("読み上げ終了")
                .setDescription("読み上げを終了しました。");

            message.channel.send({ embeds: [embed] });
        }
        else
        {
            const embed = new MessageEmbed()
                .setTitle("エラー")
                .setDescription("読み上げが開始されていません。")
                .setColor("RED");

            message.channel.send({ embeds: [embed] });
        }
    }

    async connectToChannel(voiceChannelId: string, channel: TextChannel): Promise<VoiceConnection>
    {
        const connection = joinVoiceChannel({
            channelId: voiceChannelId,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        try
        {
            await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
            const audioPlayer = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play,
                    maxMissedFrames: Math.round(5000 / 20)
                }
            });

            const subscription = connection.subscribe(audioPlayer);

            const ttsGuild = new TTSGuild(connection, channel, audioPlayer, subscription!);
            this.ttsGuilds.set(channel.guild.id, ttsGuild);

            return connection;
        }
        catch (error)
        {
            const ttsGuild = this.ttsGuilds.get(channel.guild.id);
            if (ttsGuild)
            {
                ttsGuild.destroy();
                this.ttsGuilds.delete(channel.guild.id);
            }

            throw error;
        }
    }
}
