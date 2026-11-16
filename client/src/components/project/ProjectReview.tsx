import { useState } from 'react';
import { FilmProject } from '../../types';
/** Narrow screens are for reviewing a cut; graph editing remains on desktop. */
export function ProjectReview({ project }: {
    project: FilmProject;
}) {
    const [sceneId, setSceneId] = useState(project.scenes[0]?.id);
    const scene = project.scenes.find(s => s.id === sceneId);
    const node = scene ? project.nodes[project.activeCut[scene.id]] : null;
    const media = node?.artifacts.mediaUrl;
    return <section className="project-review md:hidden flex-1 overflow-auto bg-app px-4 py-5 text-text-primary">
 <h1 className="text-xl font-semibold">{project.name}</h1><p className="text-sm text-text-muted mt-2 mb-5">Review your active cut here. Open the studio on a wider screen to edit the production graph.</p>
 {media ? <video key={media} controls playsInline src={`/api/projects/${project.id}/media/${media.split('/').map(encodeURIComponent).join('/')}`} className="w-full max-h-[50vh] bg-black rounded"/> : <div className="p-8 bg-card rounded text-sm text-text-muted">{scene ? 'No media attached to this scene.' : 'No scenes yet. Continue building your film in the desktop studio.'}</div>}
 <h2 className="text-base font-semibold mt-6 mb-3">Scenes</h2><div className="space-y-2">{project.scenes.map((s, index) => <button key={s.id} onClick={() => setSceneId(s.id)} aria-pressed={s.id === sceneId} className={`w-full min-h-12 p-3 rounded border text-left text-sm ${s.id === sceneId ? 'border-accent-primary bg-card' : 'border-subtle'}`}>{index + 1}. {s.name}<span className="float-right text-text-muted">{s.targetDurationSec}s</span></button>)}</div>
 </section>;
}
