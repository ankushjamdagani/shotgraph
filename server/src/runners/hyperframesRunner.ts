import { executeProcess, RunOptions, RunResult } from './base.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface WordTimestamp {
  word: string;
  startSec: number;
  endSec: number;
  confidence?: number;
}

export interface TranscriptResult {
  text: string;
  durationSec: number;
  words: WordTimestamp[];
}

export interface RenderOptions extends RunOptions {
  outputFormat?: 'mp4' | 'mov' | 'webm' | 'png-sequence';
  fps?: number; // 24, 30, 60
  resolution?: '1080p' | '4k' | 'custom';
  width?: number;
  height?: number;
}

/**
 * HyperFrames Local Video & Audio Runner
 * Drives on-device Kokoro TTS, Whisper transcription, and HTML-to-Video rendering.
 */
export class HyperFramesRunner {
  /**
   * Transcribes an audio or video file to word-level timestamps.
   */
  static async transcribe(
    mediaFilePath: string,
    outputJsonPath: string,
    options: RunOptions = {}
  ): Promise<TranscriptResult> {
    const args = ['hyperframes', 'transcribe', mediaFilePath, '-o', outputJsonPath];

    const runResult = await executeProcess('npx', args, {
      cwd: options.cwd ?? path.dirname(mediaFilePath),
      timeoutMs: options.timeoutMs ?? 180000,
      onStdoutChunk: options.onStdoutChunk,
      onStderrChunk: options.onStderrChunk,
    });

    if (runResult.exitCode !== 0) {
      throw new Error(`HyperFrames transcribe failed: ${runResult.stderr || runResult.stdout}`);
    }

    try {
      const content = await fs.readFile(outputJsonPath, 'utf-8');
      const data = JSON.parse(content);

      // Normalize output to standard TranscriptResult
      const words: WordTimestamp[] = (data.words || data.segments?.flatMap((s: any) => s.words) || []).map((w: any) => ({
        word: w.word?.trim() || w.text?.trim() || '',
        startSec: typeof w.start === 'number' ? w.start : parseFloat(w.start || '0'),
        endSec: typeof w.end === 'number' ? w.end : parseFloat(w.end || '0'),
        confidence: w.confidence ?? 1.0,
      }));

      return {
        text: data.text || words.map((w) => w.word).join(' '),
        durationSec: data.duration ?? (words.length > 0 ? words[words.length - 1].endSec : 0),
        words,
      };
    } catch (parseErr) {
      throw new Error(`Failed to read transcript from ${outputJsonPath}: ${(parseErr as Error).message}`);
    }
  }

  /**
   * Synthesizes speech using local on-device Kokoro-82M model.
   */
  static async synthesizeTTS(
    text: string,
    outputWavPath: string,
    options: RunOptions = {}
  ): Promise<{ filePath: string; runResult: RunResult }> {
    const args = ['hyperframes', 'tts', text, '-o', outputWavPath];

    const runResult = await executeProcess('npx', args, {
      cwd: options.cwd ?? path.dirname(outputWavPath),
      timeoutMs: options.timeoutMs ?? 120000,
      onStdoutChunk: options.onStdoutChunk,
      onStderrChunk: options.onStderrChunk,
    });

    if (runResult.exitCode !== 0) {
      throw new Error(`HyperFrames TTS failed: ${runResult.stderr || runResult.stdout}`);
    }

    return { filePath: outputWavPath, runResult };
  }

  /**
   * Renders an HTML/GSAP composition directory into a final MP4 or transparent ProRes 4444 MOV.
   */
  static async renderComposition(
    compositionDir: string,
    outputFilePath: string,
    renderOptions: RenderOptions = {}
  ): Promise<{ filePath: string; runResult: RunResult }> {
    const args = ['hyperframes', 'render', compositionDir, '-o', outputFilePath];

    if (renderOptions.outputFormat) {
      args.push('--format', renderOptions.outputFormat);
    }
    if (renderOptions.fps) {
      args.push('--fps', renderOptions.fps.toString());
    }

    const runResult = await executeProcess('npx', args, {
      cwd: compositionDir,
      timeoutMs: renderOptions.timeoutMs ?? 300000, // 5 mins max
      onStdoutChunk: renderOptions.onStdoutChunk,
      onStderrChunk: renderOptions.onStderrChunk,
    });

    if (runResult.exitCode !== 0) {
      throw new Error(`HyperFrames render failed: ${runResult.stderr || runResult.stdout}`);
    }

    return { filePath: outputFilePath, runResult };
  }

  /**
   * Captures snapshot keyframes across the timeline for visual verification.
   */
  static async captureSnapshots(
    compositionDir: string,
    outputDir: string,
    options: RunOptions = {}
  ): Promise<{ snapshotDir: string; runResult: RunResult }> {
    const args = ['hyperframes', 'snapshot', compositionDir, '-o', outputDir];

    const runResult = await executeProcess('npx', args, {
      cwd: compositionDir,
      timeoutMs: options.timeoutMs ?? 120000,
      onStdoutChunk: options.onStdoutChunk,
      onStderrChunk: options.onStderrChunk,
    });

    return { snapshotDir: outputDir, runResult };
  }
}
