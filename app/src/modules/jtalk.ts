import { exec } from 'child_process';

export function jtalk(text: string): string
{
    const filePath = 'open_jtalk.wav';
    exec(`cat ${text} | open_jtalk -v /var/lib/mecab/dic/open-jtalk/naist-jdic -m /usr/share/hts-voice/mei_normal.htsvoice -r 1.0 -ow ${filePath}`);
    return filePath;
}