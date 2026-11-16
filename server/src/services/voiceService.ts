import { executeProcess } from '../runners/base.js';
import { probeMedia } from './mediaService.js';
import { containedPath } from './fileSafety.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

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

    const cleanText = text.trim();
    const voiceDir = path.join(projectRoot, 'assets', 'voice');
    await fs.mkdir(voiceDir, { recursive: true });

    const targetFileName = `${nodeId}_voice.wav`;
    const targetAbsPath = containedPath(voiceDir, targetFileName);
    const targetRelPath = path.join('assets', 'voice', targetFileName);

    const preset = AVAILABLE_VOICE_PRESETS.find((p) => p.id === presetId) || AVAILABLE_VOICE_PRESETS[0];
    const systemVoice = preset.systemVoiceName;

    // Use a temporary AIFF scratch file for macOS native speech synthesis
    const tempAiff = path.join(os.tmpdir(), `studio_synth_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.aiff`);

    try {
      let spoken = await executeProcess('say',['-v',systemVoice,cleanText,'-o',tempAiff],{timeoutMs:60000});
      if(spoken.exitCode) spoken = await executeProcess('say',[cleanText,'-o',tempAiff],{timeoutMs:60000});
      if(spoken.exitCode) throw new Error('Speech synthesis failed. Check installed system voices.');
      const converted = await executeProcess('ffmpeg',['-y','-i',tempAiff,'-ar','44100','-ac','2',targetAbsPath],{timeoutMs:60000});
      if(converted.exitCode) throw new Error('Speech conversion failed. Check FFmpeg.');
      const info=await probeMedia(targetAbsPath);
      if(!info.hasAudio || !info.duration || (await fs.stat(targetAbsPath)).size<1000) throw new Error('Speech engine produced an empty audio file. Try another installed voice.');
      const durationSec=info.duration;
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
