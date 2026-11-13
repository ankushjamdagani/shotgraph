import { executeProcess, RunOptions, RunResult } from './base.js';
import * as path from 'path';

export interface SilenceGap {
  startSec: number;
  endSec: number;
  durationSec: number;
}

/**
 * FFmpeg and yt-dlp Local Media Processing Engine
 */
export class MediaRunner {
  /**
   * Downloads a reference video using yt-dlp.
   */
  static async downloadReference(
    url: string,
    outputDir: string,
    options: RunOptions = {}
  ): Promise<{ outputPath: string; runResult: RunResult }> {
    const template = path.join(outputDir, '%(title).50s [%(id)s].%(ext)s');
    const args = ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '-o', template, url];

    const runResult = await executeProcess('yt-dlp', args, {
      cwd: outputDir,
      timeoutMs: options.timeoutMs ?? 180000,
      onStdoutChunk: options.onStdoutChunk,
      onStderrChunk: options.onStderrChunk,
    });

    if (runResult.exitCode !== 0) {
      throw new Error(`yt-dlp download failed: ${runResult.stderr || runResult.stdout}`);
    }

    return { outputPath: outputDir, runResult };
  }

  /**
   * Extracts keyframes from a video file at a specified interval for AI visual analysis.
   */
  static async extractKeyframes(
    videoPath: string,
    outputDir: string,
    fps = 1, // 1 frame per second
    options: RunOptions = {}
  ): Promise<{ framePattern: string; runResult: RunResult }> {
    const framePattern = path.join(outputDir, 'frame_%04d.jpg');
    const args = ['-y', '-i', videoPath, '-vf', `fps=${fps},scale=720:-1`, '-q:v', '2', framePattern];

    const runResult = await executeProcess('ffmpeg', args, {
      cwd: outputDir,
      timeoutMs: options.timeoutMs ?? 120000,
      onStderrChunk: options.onStderrChunk,
    });

    if (runResult.exitCode !== 0) {
      throw new Error(`FFmpeg frame extraction failed: ${runResult.stderr}`);
    }

    return { framePattern, runResult };
  }

  /**
   * Detects silent dead air gaps in speech audio using FFmpeg silencedetect.
   */
  static async detectSilence(
    audioOrVideoPath: string,
    noiseDb = -30,
    minDurationSec = 0.5,
    options: RunOptions = {}
  ): Promise<SilenceGap[]> {
    const args = [
      '-i',
      audioOrVideoPath,
      '-af',
      `silencedetect=noise=${noiseDb}dB:d=${minDurationSec}`,
      '-f',
      'null',
      '-',
    ];

    const runResult = await executeProcess('ffmpeg', args, {
      timeoutMs: options.timeoutMs ?? 60000,
    });

    const output = runResult.stderr;
    const gaps: SilenceGap[] = [];

    const startMatches = [...output.matchAll(/silence_start: ([\d.]+)/g)];
    const endMatches = [...output.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)];

    for (let i = 0; i < Math.min(startMatches.length, endMatches.length); i++) {
      const start = parseFloat(startMatches[i][1]);
      const end = parseFloat(endMatches[i][1]);
      const duration = parseFloat(endMatches[i][2]);
      gaps.push({ startSec: start, endSec: end, durationSec: duration });
    }

    return gaps;
  }

  /**
   * Trims media losslessly / fast between start and end timestamps.
   */
  static async trimMedia(
    inputPath: string,
    outputPath: string,
    startSec: number,
    durationSec: number,
    options: RunOptions = {}
  ): Promise<{ outputPath: string; runResult: RunResult }> {
    const args = [
      '-y',
      '-ss',
      startSec.toString(),
      '-i',
      inputPath,
      '-t',
      durationSec.toString(),
      '-c',
      'copy',
      outputPath,
    ];

    const runResult = await executeProcess('ffmpeg', args, {
      timeoutMs: options.timeoutMs ?? 60000,
    });

    if (runResult.exitCode !== 0) {
      throw new Error(`FFmpeg trim failed: ${runResult.stderr}`);
    }

    return { outputPath, runResult };
  }

  /**
   * Audio ducking & mastering: Ducks music under voice by specified dB,
   * then applies EBU R128 loudness normalization to -14 LUFS.
   */
  static async duckAndMasterAudio(
    voiceWavPath: string,
    musicWavPath: string,
    outputWavPath: string,
    duckDb = 15,
    targetLufs = -14,
    options: RunOptions = {}
  ): Promise<{ outputPath: string; runResult: RunResult }> {
    const linearVol = Math.pow(10, -duckDb / 20).toFixed(3);
    const filter = `[1:a]volume=${linearVol}[ducked_music];[0:a][ducked_music]amix=inputs=2:duration=first[mixed];[mixed]loudnorm=I=${targetLufs}:TP=-1:LRA=11[out]`;

    const args = [
      '-y',
      '-i',
      voiceWavPath,
      '-i',
      musicWavPath,
      '-filter_complex',
      filter,
      '-map',
      '[out]',
      outputWavPath,
    ];

    const runResult = await executeProcess('ffmpeg', args, {
      timeoutMs: options.timeoutMs ?? 120000,
    });

    if (runResult.exitCode !== 0) {
      throw new Error(`FFmpeg audio mastering failed: ${runResult.stderr}`);
    }

    return { outputPath: outputWavPath, runResult };
  }
}
