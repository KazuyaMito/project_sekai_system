import { TextChannel, Message, Snowflake, Guild, User, GuildMember, GuildChannel, ThreadChannel, Role } from 'discord.js';
import { joinVoiceChannel, entersState, VoiceConnection, VoiceConnectionStatus, createAudioPlayer, AudioPlayer, NoSubscriberBehavior, createAudioResource, StreamType } from '@discordjs/voice'
import { Database } from '../modules/database';
import { jtalk } from '../modules/jtalk';

export class TTS
{
    voice_channels: { [index: string]: VoiceConnection; }
    text_channels: { [index: string]: string; }
    audioPlayer: AudioPlayer;
    isPlaying: boolean

    constructor()
    {
        this.voice_channels = {};
        this.text_channels = {};
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

        if (this.text_channels[guildId] && message.channel.id === this.text_channels[guildId])
        {
            const db = new Database();

            // URL省略処理
            let get_msg = message.content.replace(/https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+/, 'URL省略');

            // 複数行読み上げ
            const guildObject = await db.getGuild(parseInt(guildId, 10));
            if (guildObject.valid && guildObject.guild!.is_multi_line_read)
            {
                get_msg = get_msg.replace('\n', '、');
            }

            // 名前読み上げ
            if (guildObject !== void 0 && guildObject.guild!.is_name_read)
            {
                const name = message.member?.displayName
                if (name !== void 0) get_msg = `${name}、${get_msg}`;
            }

            // Discordスタンプ
            get_msg = get_msg.replace('<:', '');
            get_msg = get_msg.replace(/[0-9]*>/, '');

            // メンションのパース(displayNameに置き換え)
            const userMentions = get_msg.match(/<(?:@\!|@)[0-9]+>/g)
            if (userMentions != null)
            {
                userMentions.forEach(mention => {
                    const userObject = this.getUserFromMention(mention, message.guild!);
                    if (userObject.valid)
                    {
                        get_msg.replace(mention, userObject.member!.displayName);
                    }
                });
            }

            // チャンネルメンションのパース
            const channelMentions = get_msg.match(/<#[0-9]+>/g);
            if (channelMentions != null)
            {
                channelMentions.forEach(mention => {
                    const channelObject = this.getChannelFromMention(mention, message.guild!);
                    if (channelObject.valid)
                    {
                        get_msg.replace(mention, channelObject.channel!.name);
                    }
                });
            }

            // ロールメンションのパース
            const roleMentions = get_msg.match(/<@&[0-9]+>/g);
            if (roleMentions != null)
            {
                roleMentions.forEach(mention => {
                    const roleObject = this.getRoleFromMention(mention, message.guild!);
                    if (roleObject.valid)
                    {
                        get_msg.replace(mention, roleObject.role!.name);
                    }
                });
            }

            // 単語登録処理
            const dictionaryObject = await db.getDictionaries(parseInt(guildId, 10));
            if (dictionaryObject.valid)
            {
                dictionaryObject.dictionaries!.forEach(dictionary => {
                    get_msg = get_msg.replace(dictionary.word, dictionary.read);
                });
            }

            // 文字数制限
            if (guildObject.valid)
            {
                const readLimit = guildObject.guild!.read_limit;
                if (readLimit < 0 ) get_msg = get_msg.substr(0, readLimit);
            }

            const rawFileName: string = jtalk(get_msg);
            const resource = createAudioResource(rawFileName, { inputType: StreamType.Arbitrary });
            this.audioPlayer.play(resource);
        }
    }

    private async connectToChannel(channel: TextChannel): Promise<VoiceConnection>
    {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

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

    private getUserFromMention(mention: string, guild: Guild): { valid: boolean, member?: GuildMember }
    {
        if ((mention != null || mention != '') && mention.startsWith('<@') && mention.endsWith('>'))
        {
            mention = mention.slice(2, -1);

            if (mention.startsWith('!'))
            {
                mention = mention.slice(1);
            }

            return { valid: true, member: guild.members.cache.get(mention) };
        }
        else
        {
            return { valid: false };
        }
    }

    private getChannelFromMention(mention: string, guild: Guild): { valid: boolean, channel?: GuildChannel | ThreadChannel }
    {
        if ((mention != null || mention != '') && mention.startsWith('<#') && mention.endsWith('>'))
        {
            mention = mention.slice(2, -1);

            return { valid: true, channel: guild.channels.cache.get(mention) };
        }
        else
        {
            return { valid: false };
        }
    }

    private getRoleFromMention(mention: string, guild: Guild): { valid: boolean, role?: Role }
    {
        if ((mention != null || mention != '') && mention.startsWith('<@&') && mention.endsWith('>'))
        {
            mention = mention.slice(3, -1);

            return { valid: true, role: guild.roles.cache.get(mention) };
        }
        else
        {
            return { valid: false };
        }
    }
}