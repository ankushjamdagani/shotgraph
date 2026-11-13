import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VoicePreset {
  id: string;
  label: string;
  systemVoiceName: string;
  description: string;
}

export const AVAILABLE_VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'narrator_daniel',
    label: 'Daniel — British Documentary Narrator',
    systemVoiceName: 'Daniel',
    description: 'Crisp, measured, authoritative cinematic documentary tone.',
  },
  {
    id: 'presenter_eddy',
    label: 'Eddy — American Modern Tech Lead',
    systemVoiceName: 'Eddy (English (US))',
    description: 'Energetic, confident, conversational American delivery.',
  },
  {
    id: 'presenter_flo',
    label: 'Flo — American Warm Narrative',
    systemVoiceName: 'Flo (English (US))',
    description: 'Clear, engaging, articulate presenter cadence.',
  },
  {
    id: 'presenter_aman',
    label: 'Aman — Global English Presenter',
    systemVoiceName: 'Aman (English (India))',
    description: 'Smooth, approachable, global professional delivery.',
  },
];

export class VoiceService {
  /**
   * Returns list of available voice presets
   */
  static getPresets(): VoicePreset[] {
    return AVAILABLE_VOICE_PRESETS;
  }

  /**
   * Synthesizes text into a clean 44.1kHz stereo WAV file inside the project's assets/voice directory.
   */
  static async synthesizeSpeech(
    projectRoot: string,
    nodeId: string,
    text: string,
    presetId = 'narrator_daniel'
  ): Promise<{
    audioRelPath: string;
    audioAbsPath: string;
    durationSec: number;
  }> {
    if (!text || !text.trim()) {
      throw new Error('Speech synthesis requires non-empty dialogue text.');
    }

    const cleanText = text.replace(/["\\`$]/g, ' ').trim();
    const voiceDir = path.join(projectRoot, 'assets', 'voice');
    await fs.mkdir(voiceDir, { recursive: true });

    const targetFileName = `${nodeId}_voice.wav`;
    const targetAbsPath = path.join(voiceDir, targetFileName);
    const targetRelPath = path.join('assets', 'voice', targetFileName);

    const preset = AVAILABLE_VOICE_PRESETS.find((p) => p.id === presetId) || AVAILABLE_VOICE_PRESETS[0];
    const systemVoice = preset.systemVoiceName;

    // Use a temporary AIFF scratch file for macOS native speech synthesis
    const tempAiff = path.join(os.tmpdir(), `studio_synth_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.aiff`);

    try {
      // 1. Synthesize via macOS say
      try {
        await execAsync(`say -v "${systemVoice}" "${cleanText}" -o "${tempAiff}"`);
      } catch {
        // Fallback to default say voice if named voice is not installed
        await execAsync(`say "${cleanText}" -o "${tempAiff}"`);
      }

      // 2. Transcode to high-quality 44.1kHz stereo broadcast WAV using ffmpeg
      await execAsync(`ffmpeg -y -i "${tempAiff}" -ar 44100 -ac 2 "${targetAbsPath}"`);

      // 3. Inspect duration using ffprobe
      let durationSec = 3.0;
      try {
        const { stdout } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${targetAbsPath}"`
        );
        const parsed = parseFloat(stdout.trim());
        if (!isNaN(parsed) && parsed > 0) {
          durationSec = Math.round(parsed * 100) / 100;
        }
      } catch {
        // Fallback duration estimate based on word count (~150 words per minute)
        const wordCount = cleanText.split(/\s+/).length;
        durationSec = Math.max(1.5, Math.round((wordCount / 2.5) * 10) / 10);
      }

      return {
        audioRelPath: targetRelPath,
        audioAbsPath: targetAbsPath,
        durationSec,
      };
    } finally {
      // Clean up scratch temp file
      try {
        await fs.rm(tempAiff, { force: true });
      } catch {
        // Ignore scratch cleanup error
      }
    }
  }
}
