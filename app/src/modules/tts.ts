import { TextChannel, Message, Snowflake, Collection } from 'discord.js';
import { joinVoiceChannel, entersState, VoiceConnection, VoiceConnectionStatus, createAudioPlayer, AudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType } from '@discordjs/voice'
import { Database } from '../modules/database';
import { jtalk } from '../modules/jtalk';
import { MessageParser } from '../modules/messageParser';

export class TTS
{
    voice_channels: Collection<string, VoiceConnection>;
    text_channels: Collection<string, TextChannel>;
    audioPlayer: AudioPlayer;
    isPlaying: boolean

    constructor()
    {
        this.voice_channels = new Collection();
        this.text_channels = new Collection();
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
                maxMissedFrames: Math.round(5000 / 20)
            }
        });
        this.isPlaying = false;
    }

    public async onMessage(message: Message): Promise<void>
    {
        if (message === null || message.author.bot || message.guild === null || message.content.startsWith('&') || message.content.startsWith(';'))
            return;

        const guildId: Snowflake = message.guild.id;
        const textChannel = this.text_channels.get(guildId);

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

            const rawFileName: string = jtalk(msg);
            const resource = createAudioResource(rawFileName, { inputType: StreamType.Arbitrary });
            this.audioPlayer.play(resource);
        }
    }

    public async connectToChannel(voiceChannelId: string, channel: TextChannel): Promise<VoiceConnection>
    {
        const connection = joinVoiceChannel({
            channelId: voiceChannelId,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        this.voice_channels.set(channel.guild.id, connection);
        this.text_channels.set(channel.guild.id, channel);

        try
        {
            await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
            return connection;
        }
        catch (error)
        {
            connection.destroy();
            throw error;
        }
    }
}