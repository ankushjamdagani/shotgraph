import { z } from 'zod';
import { SkillDefinition } from '../core/types.js';
export const TimelineClipItemSchema = z.object({ id: z.string(), name: z.string(), relativeFilePath: z.string(), startSec: z.number().nonnegative(), durationSec: z.number().positive(), track: z.enum(['V1_footage', 'V2_overlay', 'A1_dialogue', 'A2_sfx', 'A3_music']), text: z.string().optional(), hasAudio: z.boolean().optional() });
export type TimelineClipItem = z.infer<typeof TimelineClipItemSchema>;
export const FCPXMLBuilderInputSchema = z.object({ projectName: z.string(), totalDurationSec: z.number().positive(), fps: z.union([z.literal(24), z.literal(25), z.literal(29.97), z.literal(30), z.literal(60)]).default(30), width: z.number().default(1080), height: z.number().default(1920), clips: z.array(TimelineClipItemSchema) });
export type FCPXMLBuilderInput = z.infer<typeof FCPXMLBuilderInputSchema>;
export const FCPXMLBuilderOutputSchema = z.object({ fcpxmlContent: z.string(), edlContent: z.string(), srtContent: z.string(), exportedFileCount: z.number(), instructions: z.string() });
export type FCPXMLBuilderOutput = z.infer<typeof FCPXMLBuilderOutputSchema>;
const xml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
export const skillFCPXMLBuilder: SkillDefinition<FCPXMLBuilderInput, FCPXMLBuilderOutput> = {
    id: 'skill-fcpxml-builder', name: 'DaVinci Resolve Multi-Track FCPXML Builder', description: 'Build a frame-aligned timeline referencing validated bundle media.', version: '2.0.0', inputSchema: FCPXMLBuilderInputSchema, outputSchema: FCPXMLBuilderOutputSchema,
    async execute(input) {
        const denominator = input.fps === 29.97 ? 30000 : input.fps;
        const numerator = input.fps === 29.97 ? 1001 : 1;
        const frames = (sec: number) => Math.round(sec * denominator / numerator);
        const time = (sec: number) => `${frames(sec) * numerator}/${denominator}s`;
        const tc = (sec: number) => { const n = Math.round(input.fps), f = frames(sec); return [Math.floor(f / (n * 3600)), Math.floor(f / (n * 60)) % 60, Math.floor(f / n) % 60, f % n].map(v => String(v).padStart(2, '0')).join(':'); };
        const resources = input.clips.map((clip, i) => `<asset id="a${i}" name="${xml(clip.name)}" start="0s" duration="${time(clip.durationSec)}" hasVideo="${clip.track.startsWith('V') ? 1 : 0}" hasAudio="${clip.hasAudio || clip.track.startsWith('A') ? 1 : 0}"${clip.track.startsWith('V') ? ' format="f1"' : ' audioSources="1" audioChannels="2" audioRate="48000"'}><media-rep kind="original-media" src="${xml('file:./' + clip.relativeFilePath.split('/').map(encodeURIComponent).join('/'))}"/></asset>`).join('\n');
        const clips = input.clips.map((clip, i) => `<asset-clip ref="a${i}" name="${xml(clip.name)}" lane="${({ V1_footage: 1, V2_overlay: 2, A1_dialogue: -1, A2_sfx: -2, A3_music: -3 })[clip.track]}" offset="${time(clip.startSec)}" start="0s" duration="${time(clip.durationSec)}"/>`).join('\n');
        const fcpxmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE fcpxml>\n<fcpxml version="1.10"><resources><format id="f1" frameDuration="${numerator}/${denominator}s" width="${input.width}" height="${input.height}"/>${resources}</resources><library><event name="${xml(input.projectName)}"><project name="${xml(input.projectName)}"><sequence format="f1" duration="${time(input.totalDurationSec)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k"><spine><gap name="Timeline" offset="0s" start="0s" duration="${time(input.totalDurationSec)}">${clips}</gap></spine></sequence></project></event></library></fcpxml>`;
        const edlContent = [`TITLE: ${input.projectName.replace(/[\r\n]/g, ' ')}`, 'FCM: NON-DROP FRAME', '', ...input.clips.filter(c => c.track === 'V1_footage').flatMap((clip, i) => [`${String(i + 1).padStart(3, '0')}  AX       V     C        ${tc(0)} ${tc(clip.durationSec)} ${tc(clip.startSec)} ${tc(clip.startSec + clip.durationSec)}`, `* FROM CLIP NAME: ${clip.name.replace(/[\r\n]/g, ' ')}`, `* FILE PATH: ${clip.relativeFilePath}`, ''])].join('\n');
        const srtTime = (sec: number) => { const ms = Math.round(sec * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
        const srtContent = input.clips.filter(c => c.text?.trim()).map((c, i) => `${i + 1}\n${srtTime(c.startSec)} --> ${srtTime(c.startSec + c.durationSec)}\n${c.text}\n`).join('\n');
        return { fcpxmlContent, edlContent, srtContent, exportedFileCount: input.clips.length, instructions: 'Import timeline.fcpxml in DaVinci Resolve. Keep the media folders beside the timeline. Relink to this bundle if Resolve requests a media location. EDL contains the primary video track only.' };
    }
};
