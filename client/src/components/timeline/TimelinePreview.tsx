import { useEffect, useRef, useState } from 'react';
import { FilmProject, VersionNode } from '../../types';
export function TimelinePreview({ project, node, time, playing, onPause, safeAreas }: {
    project: FilmProject;
    node: VersionNode | null | undefined;
    time: number;
    playing: boolean;
    onPause: () => void;
    safeAreas: boolean;
}) {
    const video = useRef<HTMLVideoElement>(null);
    const audio = useRef<HTMLAudioElement>(null);
    const [error, setError] = useState('');
    const url = (relative: string) => `/api/projects/${encodeURIComponent(project.id)}/media/${relative.split('/').map(encodeURIComponent).join('/')}`;
    const source = node?.artifacts.mediaUrl;
    const dialogue = node?.artifacts.audioUrl;
    useEffect(() => { setError(''); }, [source, dialogue]);
    useEffect(() => {
        for (const media of [video.current, audio.current]) {
            if (!media)
                continue;
            if (Math.abs(media.currentTime - time) > 0.2)
                media.currentTime = Math.max(0, time);
            if (playing)
                media.play().catch(() => { setError('Playback could not start. Check this media file.'); onPause(); });
            else
                media.pause();
        }
    }, [time, playing, source, dialogue]);
    return <div className="flex items-center gap-5 px-4 py-3 bg-app border-b border-subtle">
 <div className="relative w-64 h-36 shrink-0 bg-black flex justify-center items-center rounded overflow-hidden">
 {source ? <video ref={video} src={url(source)} playsInline muted={!!dialogue} className="w-full h-full object-contain" onError={() => { setError('Media is missing or cannot be decoded. Import a replacement.'); onPause(); }}/> : <p className="text-xs text-neutral-300 px-5 text-center">No video attached to this scene’s active take.</p>}
 {dialogue && <audio ref={audio} src={url(dialogue)} onError={() => { setError('Dialogue media could not be read.'); onPause(); }}/>}
 {safeAreas && <div aria-label="Safe area overlay" className="absolute pointer-events-none border border-yellow-400 inset-x-[10%] top-[10%] bottom-[20%]"/>}
 </div><div className="text-sm min-w-0"><p className="font-semibold">Active cut preview</p><p className="text-text-muted mt-1">{node?.title || 'Select a take'} · {project.aspectRatio}</p><p className="text-text-muted mt-1">{safeAreas ? 'Safe-area guides enabled' : 'Plays attached video and dialogue in scene order.'}</p>{error && <p role="alert" className="text-red-500 mt-2">{error}</p>}</div>
 </div>;
}
