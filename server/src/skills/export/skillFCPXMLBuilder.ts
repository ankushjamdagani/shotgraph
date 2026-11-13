import { z } from 'zod';
import { SkillDefinition, SkillExecutionContext } from '../core/types.js';

export const TimelineClipItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  relativeFilePath: z.string(), // e.g. "V1_footage/take_01.mp4"
  startSec: z.number(),
  durationSec: z.number(),
  track: z.enum(['V1_footage', 'V2_overlay', 'A1_dialogue', 'A2_sfx', 'A3_music']),
});
export type TimelineClipItem = z.infer<typeof TimelineClipItemSchema>;

export const FCPXMLBuilderInputSchema = z.object({
  projectName: z.string(),
  totalDurationSec: z.number(),
  fps: z.union([z.literal(24), z.literal(29.97), z.literal(30), z.literal(60)]).default(30),
  width: z.number().default(1080),
  height: z.number().default(1920),
  clips: z.array(TimelineClipItemSchema),
});
export type FCPXMLBuilderInput = z.infer<typeof FCPXMLBuilderInputSchema>;

export const FCPXMLBuilderOutputSchema = z.object({
  fcpxmlContent: z.string(),
  edlContent: z.string(),
  srtContent: z.string(),
  exportedFileCount: z.number(),
  instructions: z.string(),
});
export type FCPXMLBuilderOutput = z.infer<typeof FCPXMLBuilderOutputSchema>;

export const skillFCPXMLBuilder: SkillDefinition<FCPXMLBuilderInput, FCPXMLBuilderOutput> = {
  id: 'skill-fcpxml-builder',
  name: 'DaVinci Resolve Multi-Track FCPXML Builder',
  description: 'Generates standardized FCPXML v1.10 and EDL multi-track timeline documents for 1-click import into DaVinci Resolve.',
  version: '1.0.0',
  inputSchema: FCPXMLBuilderInputSchema,
  outputSchema: FCPXMLBuilderOutputSchema,

  async execute(input: FCPXMLBuilderInput, context: SkillExecutionContext): Promise<FCPXMLBuilderOutput> {
    const fps = input.fps === 29.97 ? 30 : input.fps;
    const frameDuration = `100/${fps * 100}s`;

    // 1. Resources: define format and asset links
    const assetElements: string[] = [];
    input.clips.forEach((clip, index) => {
      const assetId = `r_asset_${index + 1}`;
      const hasVideo = clip.track.startsWith('V') ? '1' : '0';
      const hasAudio = clip.track.startsWith('A') ? '1' : '0';
      assetElements.push(
        `<asset id="${assetId}" name="${clip.name}" src="${clip.relativeFilePath}" start="0s" duration="${clip.durationSec}s" hasVideo="${hasVideo}" hasAudio="${hasAudio}"/>`
      );
    });

    // 2. Separate clips by tracks
    const v1Clips = input.clips.filter((c) => c.track === 'V1_footage');
    const v2Clips = input.clips.filter((c) => c.track === 'V2_overlay');
    const a1Clips = input.clips.filter((c) => c.track === 'A1_dialogue');
    const a2Clips = input.clips.filter((c) => c.track === 'A2_sfx');
    const a3Clips = input.clips.filter((c) => c.track === 'A3_music');

    // 3. Construct Primary Spine and Connected Clips
    const spineElements: string[] = [];
    v1Clips.forEach((clip, i) => {
      const assetId = `r_asset_${input.clips.indexOf(clip) + 1}`;
      spineElements.push(
        `<clip name="${clip.name}" offset="${clip.startSec}s" duration="${clip.durationSec}s" start="0s">
           <video ref="${assetId}" offset="0s" duration="${clip.durationSec}s"/>
         </clip>`
      );
    });

    // Connected V2 Overlay clips
    const v2Elements = v2Clips.map((clip) => {
      const assetId = `r_asset_${input.clips.indexOf(clip) + 1}`;
      return `<clip name="${clip.name}" lane="1" offset="${clip.startSec}s" duration="${clip.durationSec}s" start="0s">
                <video ref="${assetId}" offset="0s" duration="${clip.durationSec}s"/>
              </clip>`;
    });

    // Connected Audio stems
    const audioElements = [...a1Clips, ...a2Clips, ...a3Clips].map((clip) => {
      const assetId = `r_asset_${input.clips.indexOf(clip) + 1}`;
      const lane = clip.track === 'A1_dialogue' ? '-1' : clip.track === 'A2_sfx' ? '-2' : '-3';
      return `<clip name="${clip.name}" lane="${lane}" offset="${clip.startSec}s" duration="${clip.durationSec}s" start="0s">
                <audio ref="${assetId}" offset="0s" duration="${clip.durationSec}s"/>
              </clip>`;
    });

    const fcpxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="r_format" name="FFVideoFormat${input.width}x${input.height}p${fps}" frameDuration="${frameDuration}" width="${input.width}" height="${input.height}"/>
    ${assetElements.join('\n    ')}
  </resources>
  <library>
    <event name="${input.projectName}">
      <project name="${input.projectName}">
        <sequence format="r_format" duration="${input.totalDurationSec}s">
          <spine>
            ${spineElements.length > 0 ? spineElements.join('\n            ') : `<gap name="Master Gap" duration="${input.totalDurationSec}s"/>`}
            ${v2Elements.join('\n            ')}
            ${audioElements.join('\n            ')}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;

    // 4. Construct universal EDL fallback
    const edlLines = [
      `TITLE: ${input.projectName}`,
      `FCM: NON-DROP FRAME`,
      '',
    ];
    input.clips.forEach((clip, idx) => {
      const eventNum = (idx + 1).toString().padStart(3, '0');
      const trackCode = clip.track.startsWith('V') ? 'V' : 'A';
      edlLines.push(
        `${eventNum}  AX       ${trackCode}     C        00:00:00:00 00:00:${Math.floor(clip.durationSec).toString().padStart(2, '0')}:00 00:00:${Math.floor(clip.startSec).toString().padStart(2, '0')}:00 00:00:${Math.floor(clip.startSec + clip.durationSec).toString().padStart(2, '0')}:00`
      );
      edlLines.push(`* FROM CLIP NAME: ${clip.name}`);
      edlLines.push(`* FILE PATH: ${clip.relativeFilePath}`);
      edlLines.push('');
    });
    const edlContent = edlLines.join('\n');

    // 5. Construct SRT subtitles
    const srtLines: string[] = [];
    a1Clips.forEach((clip, i) => {
      const startMs = Math.floor(clip.startSec * 1000);
      const endMs = Math.floor((clip.startSec + clip.durationSec) * 1000);
      const formatTime = (ms: number) => {
        const hrs = Math.floor(ms / 3600000).toString().padStart(2, '0');
        const mins = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
        const secs = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
        const millis = (ms % 1000).toString().padStart(3, '0');
        return `${hrs}:${mins}:${secs},${millis}`;
      };

      srtLines.push((i + 1).toString());
      srtLines.push(`${formatTime(startMs)} --> ${formatTime(endMs)}`);
      srtLines.push(clip.name);
      srtLines.push('');
    });
    const srtContent = srtLines.join('\n');

    return {
      fcpxmlContent,
      edlContent,
      srtContent,
      exportedFileCount: input.clips.length,
      instructions: `In DaVinci Resolve: File -> Import Timeline -> Import AAF, EDL, XML... -> select timeline.fcpxml. All video, overlay, and audio tracks will populate automatically.`,
    };
  },
};
