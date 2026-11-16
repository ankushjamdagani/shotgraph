import * as runner from '../../src/runners/base.js';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { VoiceService } from '../../src/services/voiceService.js';

describe('VoiceService Local Speech Synthesis', () => {
  afterEach(()=>vi.restoreAllMocks());
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video_studio_voice_test_'));
  });

  it('lists available offline voice presets', () => {
    const presets = VoiceService.getPresets();
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.some((p) => p.id === 'narrator_daniel')).toBe(true);
  });

  it('synthesizes dialogue into a valid 44.1kHz WAV file with duration', async () => {
    vi.spyOn(runner,'executeProcess').mockImplementation(async(command,args)=>{
      if(command==='ffmpeg') await fs.writeFile(args.at(-1)!,Buffer.alloc(2000));
      return {exitCode:0,stderr:'',durationMs:1,stdout:command==='ffprobe'?JSON.stringify({format:{duration:'3.2'},streams:[{codec_type:'audio'}]}):''};
    });
    const text = 'Every great story begins with an unexpected moment.';
    const result = await VoiceService.synthesizeSpeech(tempDir, 'node_voice_01', text, 'narrator_daniel');

    expect(result.audioRelPath).toBe('assets/voice/node_voice_01_voice.wav');
    expect(result.durationSec).toBeGreaterThan(0.5);

    // Verify file exists on disk
    const stat = await fs.stat(result.audioAbsPath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(1000); // WAV header + audio payload
  });

  it('rejects empty output instead of estimating duration',async()=>{
    vi.spyOn(runner,'executeProcess').mockImplementation(async(command,args)=>{
      if(command==='ffmpeg') await fs.writeFile(args.at(-1)!,Buffer.alloc(78));
      return {exitCode:0,stderr:'',durationMs:1,stdout:command==='ffprobe'?JSON.stringify({format:{duration:'0'},streams:[{codec_type:'audio'}]}):''};
    });
    await expect(VoiceService.synthesizeSpeech(tempDir,'empty','Test')).rejects.toThrow('empty audio');
  });
  it('throws an error if dialogue text is empty', async () => {
    await expect(
      VoiceService.synthesizeSpeech(tempDir, 'node_voice_02', '   ')
    ).rejects.toThrow('Speech synthesis requires non-empty dialogue text.');
  });
});
