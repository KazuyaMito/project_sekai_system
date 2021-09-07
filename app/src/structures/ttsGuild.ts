import { AudioPlayer, AudioPlayerStatus, AudioResource, PlayerSubscription, VoiceConnection } from "@discordjs/voice";
import { TextChannel } from "discord.js";
import { Queue } from "../modules/queue";

export class TTSGuild
{
    _voiceConnection: VoiceConnection;
    _textChannel: TextChannel;
    _audioPlayer: AudioPlayer;
    _subscription: PlayerSubscription;
    _isPlaying: boolean;
    _messages: Queue<string>;

    constructor(voiceChannel: VoiceConnection, textChannel: TextChannel, audioPlayer: AudioPlayer, subscription: PlayerSubscription)
    {
        this._voiceConnection = voiceChannel;
        this._textChannel = textChannel;
        this._audioPlayer = audioPlayer;
        this._subscription = subscription;
        this._isPlaying = false;
        this._messages = new Queue<string>();

        this._audioPlayer.on(AudioPlayerStatus.Idle, () => { this._isPlaying = false; });
    }

    get isPlaying(): boolean
    {
        return this._isPlaying;
    }

    get voiceConnection(): VoiceConnection
    {
        return this._voiceConnection;
    }

    get textChannel(): TextChannel
    {
        return this._textChannel;
    }

    get message(): string
    {
        const message = this._messages.pop();
        return message ? message : "";
    }

    get currentMessage(): string
    {
        const message = this._messages.current();
        return message ? message : "";
    }

    set message(message: string)
    {
        this._messages.push(message);
    }

    public playAudio(resource: AudioResource): void
    {
        this._isPlaying = true;
        this._audioPlayer.play(resource);
    }

    public destroy(): void
    {
        this._subscription.unsubscribe();
        this._voiceConnection.destroy();
    }
}