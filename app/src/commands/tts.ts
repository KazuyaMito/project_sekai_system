import { TextChannel, Message, MessageEmbed, Collection, Snowflake, VoiceState, VoiceChannel } from 'discord.js';
import { Command } from '../structures/command';
import { createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { Database } from '../modules/database';
import { jtalk } from '../modules/jtalk';
import { MessageParser } from '../modules/messageParser';
import { TTSGuild } from '../structures/ttsGuild';

const db = new Database();

enum TTSGuildSettingType
{
    ReadName,
    ReadMulti,
}

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
            case undefined:
                this.help(message);
                break;

            case "join":
            case "j":
                this.join(message);
                break;

            case "end":
            case "e":
                this.end(message);
                break;

            case "read_name":
            case "rn":
                this.readName(message, args[1]);
                break;

            case "read_multi":
            case "rm":
                this.readMulti(message, args[1]);
                break;

            case "read_limit":
            case "rl":
                this.readLimit(message, args[1]);
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

            // ??????????????????
            const dictionaryObject = await db.getDictionaries(parseInt(guildId, 10));
            if (dictionaryObject.valid)
            {
                dictionaryObject.dictionaries!.forEach(dictionary => {
                    msg = msg.replace(dictionary.word, dictionary.read);
                });
            }

            // ???????????????
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
            if(queuedMessage !== "")
            {
                const rawFileName: string = jtalk(queuedMessage);
                const resource = createAudioResource(rawFileName, { inputType: StreamType.Arbitrary });
                ttsGuild.playAudio(resource);
            }
        }
    }

    public onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void
    {
        const ttsGuild = this.ttsGuilds.get(oldState.guild.id);
        if (ttsGuild && oldState.channelId !== null && ttsGuild.voiceChannel.id === oldState.channel!.id && newState.channelId === null && oldState.channel!.members.size <= 2)
        {
            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("??????????????????")
                .setDescription("?????????????????????????????????????????????????????????????????????");

            ttsGuild.textChannel.send({ embeds: [embed] });
            ttsGuild.destroy();
            this.ttsGuilds.delete(oldState.guild.id);
        }
    }

    private async join(message: Message): Promise<void>
    {
        if (message.member?.voice.channel)
        {
            if (typeof message.member.voice.channel.id === "string" && message.channel instanceof TextChannel && message.member.voice.channel instanceof VoiceChannel)
            {
                const connection: VoiceConnection = await this.connectToChannel(message.member.voice.channel, message.channel);
                const guild = message.guild;

                const guildFromDatabase = await db.getGuild(parseInt(guild!.id, 10));
                if(! guildFromDatabase.valid)
                {
                    db.addGuild(parseInt(guild!.id, 10), guild!.name);
                }

                const embed = new MessageEmbed()
                    .setColor("GREEN")
                    .setTitle("????????????")
                    .setDescription("??????????????????????????????????????????????????????????????????????????? `&tts end` ???????????????????????????")
                    .addField("??????????????????",`<#${message.channel.id}>`)
                    .addField("????????????????????????",`<#${connection.joinConfig.channelId}>`);

                message.channel.send({ embeds: [embed] });
            }
        }
        else
        {
            const embed = new MessageEmbed()
            .setDescription("??????????????????????????????????????????????????????")
            .setColor("RED");

            message.channel.send({ embeds: [embed] });
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
                .setTitle("??????????????????")
                .setDescription("????????????????????????????????????");

            message.channel.send({ embeds: [embed] });
        }
        else
        {
            const embed = new MessageEmbed()
                .setTitle("?????????")
                .setDescription("?????????????????????????????????????????????")
                .setColor("RED");

            message.channel.send({ embeds: [embed] });
        }
    }

    private async help(message: Message)
    {
        const embed = new MessageEmbed()
            .setColor("AQUA")
            .setTitle("Text To Speach")
            .setDescription("?????????????????????????????????????????????????????????")
            .addField("join", "???????????????????????????????????????????????????????????????????????????bot?????????????????????\n???????????????j????????????????????????")
            .addField("end", "???????????????????????????Bot???????????????????????????????????????????????????\n???????????????e????????????????????????")
            .addField("read_name", "????????????????????????????????????????????????\n`&tts read_name [on / off]`\n???????????????rn????????????????????????")
            .addField("read_multi", "???????????????????????????????????????????????????\n`&tts read_multi [on / off]`\n???????????????rm????????????????????????")
            .addField("read_limit", "???????????????????????????????????????????????????\n`&tts read_limit [0-9]`\n???????????????rl????????????????????????");

        message.channel.send({ embeds: [embed] });
    }

    private async readName(message: Message, readName: string)
    {
        this.updateGuildSetting(message, readName, TTSGuildSettingType.ReadName);
    }

    private async readMulti(message: Message, readMulti: string)
    {
        this.updateGuildSetting(message, readMulti, TTSGuildSettingType.ReadMulti);
    }

    private async readLimit(message: Message, limit: string)
    {
        const guildId = message.guild!.id;
        const guild = await db.getGuild(parseInt(guildId, 10));

        if (! guild.valid)
        {
            const embed = new MessageEmbed()
                .setColor("RED")
                .setTitle("?????????")
                .setDescription(`guild_id: ${guildId}?????????????????????????????????\n\`&tts join\`????????????????????????????????????????????????`);

            message.channel.send({ embeds: [embed] });
        }
        else
        {
            db.setReadLimit(parseInt(limit, 10), parseInt(guildId, 10));

            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("??????????????????")
                .setDescription("???????????????????????????")
                .addField("???????????????????????????", limit.toUpperCase());

            message.channel.send({ embeds: [embed] });
        }
    }


    private async updateGuildSetting(message: Message, flag: string, type: TTSGuildSettingType)
    {
        const guildId = message.guild!.id;
        const guild = await db.getGuild(parseInt(guildId, 10));

        if (! guild.valid)
        {
            const embed = new MessageEmbed()
                .setColor("RED")
                .setTitle("?????????")
                .setDescription(`guild_id: ${guildId}?????????????????????????????????\n\`&tts join\`????????????????????????????????????????????????`);

            message.channel.send({ embeds: [embed] });
        }
        else
        {
            let readable = false;
            switch(flag)
            {
                case "on":
                    readable = true;
                    break;
                case "off":
                    readable = false;
                    break;
                default:
                    const embed = new MessageEmbed()
                        .setColor("RED")
                        .setTitle("?????????")
                        .setDescription("`on`?????????`off`???????????????????????????");

                    message.channel.send({ embeds: [embed] });
                    break;
            }

            let typeName = "";
            switch (type)
            {
                case TTSGuildSettingType.ReadName:
                    db.setReadName(readable, parseInt(guildId, 10));
                    typeName = "??????????????????";
                    break;
                case TTSGuildSettingType.ReadMulti:
                    db.setReadMultiLine(readable, parseInt(guildId, 10));
                    typeName = "?????????????????????";
                    break;
            }

            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("??????????????????")
                .setDescription("???????????????????????????")
                .addField(typeName, flag.toUpperCase());

            message.channel.send({ embeds: [embed] });
        }
    }

    async connectToChannel(voiceChannel: VoiceChannel, channel: TextChannel): Promise<VoiceConnection>
    {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
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

            const ttsGuild = new TTSGuild(connection, voiceChannel, channel, audioPlayer, subscription!);
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
