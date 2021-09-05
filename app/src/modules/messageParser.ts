import { Guild, GuildMember, GuildChannel, ThreadChannel, Role } from "discord.js";

export class MessageParser
{
    static getUserFromMention(mention: string, guild: Guild): { valid: boolean, member?: GuildMember }
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

    static getChannelFromMention(mention: string, guild: Guild): { valid: boolean, channel?: GuildChannel | ThreadChannel }
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

    static getRoleFromMention(mention: string, guild: Guild): { valid: boolean, role?: Role }
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

    static omitTheURL(message: string): string
    {
        return message.replace(/https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+/, 'URL省略');
    }

    static removeLineBreak(message: string): string
    {
        return message.replace('\n', '、');
    }

    static addUserName(message: string, userName: string): string
    {
        return `${userName}、${message}`;
    }

    static parseDiscordReaction(message: string): string
    {
        let msg = message.replace('<:', '');
        return msg.replace(/[0-9]*>/, '');
    }

    static parseUserMentions(message: string, userMentions: RegExpMatchArray, guild: Guild): string
    {
        userMentions.forEach(mention => {
            const userObject = MessageParser.getUserFromMention(mention, guild!);
            if (userObject.valid)
            {
                message.replace(mention, userObject.member!.displayName);
            }
        });

        return message;
    }

    static parseChannelMentions(message: string, channelMentions: RegExpMatchArray, guild: Guild): string
    {
        channelMentions.forEach(mention => {
            const channelObject = MessageParser.getChannelFromMention(mention, guild!);
            if (channelObject.valid)
            {
                message.replace(mention, channelObject.channel!.name);
            }
        });

        return message;
    }

    static parseRoleMentions(message: string, roleMentions: RegExpMatchArray, guild: Guild): string
    {
        roleMentions.forEach(mention => {
            const roleObject = MessageParser.getRoleFromMention(mention, guild!);
            if (roleObject.valid)
            {
                message.replace(mention, roleObject.role!.name);
            }
        });

        return message;
    }
}