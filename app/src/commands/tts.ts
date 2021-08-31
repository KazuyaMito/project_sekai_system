import { TextChannel, Message, Snowflake } from 'discord.js';
import { joinVoiceChannel, entersState, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice'
import { Database } from '../modules/database';

export class TTS
{
    voice_channels: { [index: string]: VoiceConnection; }
    text_channels: { [index: string]: string; }

    constructor()
    {
        this.voice_channels = {};
        this.text_channels = {};
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
            let get_msg = message.content.replace('https?://[\w/:%#\$&\?\(\)~\.=\+\-]+', 'URL省略');

            // 複数行読み上げ
            const guild = await db.getGuild(parseInt(guildId, 10));
            if (guild !== void 0 && guild.is_multi_line_read)
            {
                get_msg = get_msg.replace('\n', '、');
            }

            // 名前読み上げ
            if(guild !== void 0 && guild.is_name_read)
            {
                const name = message.member?.displayName
                if (name !== void 0) get_msg = `${name}、${get_msg}`;
            }

            // Discordスタンプ
            get_msg = get_msg.replace('<:', '');
            get_msg = get_msg.replace('[0-9]*>', '');

            // メンションのパース(displayNameに置き換え)
            if (message.mentions.members !== null && message.mentions.members.size > 0)
            {
                message.mentions.members
                    .forEach(member => {
                        const displayName = member.displayName;
                        get_msg = get_msg.replace('<(?:@\!|@)[0-9]+>', displayName);
                    });
            }

            // チャンネルメンションのパース
            
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
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
            return connection;
        }
        catch (error)
        {
            connection.destroy();
            throw error;
        }
    }
}