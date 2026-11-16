import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { executeProcess } from '../runners/base.js';
import { containedPath } from './fileSafety.js';
const exec = promisify(execFile);
export async function probeMedia(file: string) {
    const run = await executeProcess('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], { timeoutMs: 30000 });
    if (run.exitCode)
        throw new Error('Media could not be read. Install FFmpeg and use a supported video or audio file.');
    const data = JSON.parse(run.stdout);
    return { duration: Number(data.format?.duration || 0), hasVideo: data.streams.some((s: any) => s.codec_type === 'video'), hasAudio: data.streams.some((s: any) => s.codec_type === 'audio') };
}
export async function importMedia(root: string, bytes: Buffer, filename: string, start: number, duration: number) {
    const id = crypto.randomUUID();
    const ext = path.extname(filename).toLowerCase();
    if (!['.mp4', '.mov', '.webm', '.mkv', '.wav', '.mp3', '.m4a', '.png', '.jpg', '.jpeg', '.webp'].includes(ext))
        throw Object.assign(new Error('Unsupported media type'), { statusCode: 400 });
    const source = containedPath(root, `raw_footage/${id}${ext}`);
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.writeFile(source, bytes);
    const info = await probeMedia(source);
    const image = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    if (!image && (!Number.isFinite(info.duration) || start < 0 || duration <= 0 || start + duration > info.duration + 0.1))
        throw Object.assign(new Error('Trim exceeds source duration. The original file was retained.'), { statusCode: 400 });
    const relative = image ? `raw_footage/${id}${ext}` : `assets/${info.hasVideo ? 'video_clips' : 'voice'}/${id}.${info.hasVideo ? 'mp4' : 'wav'}`;
    const output = containedPath(root, relative);
    await fs.mkdir(path.dirname(output), { recursive: true });
    if (!image) {
        const args = ['-y', '-ss', String(start), '-i', source, '-t', String(duration), ...(info.hasVideo ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart'] : ['-vn', '-c:a', 'pcm_s16le']), output];
        const run = await executeProcess('ffmpeg', args, { timeoutMs: 180000 });
        if (run.exitCode)
            throw new Error('Trim failed. The original file was retained.');
    }
    let waveform: number[] = [];
    if (info.hasAudio) {
        const { stdout } = await exec('ffmpeg', ['-v', 'error', '-i', output, '-vn', '-ac', '1', '-ar', '1000', '-f', 'f32le', 'pipe:1'], { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024, timeout: 30000 });
        const samples = Math.floor(stdout.length / 4);
        const step = Math.max(1, Math.ceil(samples / 120));
        for (let i = 0; i < samples; i += step) {
            let peak = 0;
            for (let j = i; j < Math.min(samples, i + step); j++)
                peak = Math.max(peak, Math.abs(stdout.readFloatLE(j * 4)));
            waveform.push(peak);
        }
    }
    return { relative, source: path.relative(root, source), duration: image ? duration : Math.min(duration, info.duration - start), hasVideo: info.hasVideo, hasAudio: info.hasAudio, waveform, image };
}
