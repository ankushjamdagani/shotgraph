import { z } from 'zod';
import { wouldCreateCycle } from './graphEngine.js';
import type { FilmProject } from './projectService.js';
const record = z.record(z.any());
export const projectSchema = z.object({
    id: z.string().min(1), name: z.string().trim().min(1), projectRoot: z.string().min(1),
    fps: z.union([z.literal(24), z.literal(25), z.literal(29.97), z.literal(30), z.literal(60)]),
    targetDurationSec: z.number().positive(), aspectRatio: z.enum(['9:16', '16:9', '1:1', '2.39:1']),
    scenes: z.array(z.object({ id: z.string().min(1), name: z.string(), order: z.number(), targetDurationSec: z.number().positive() })),
    activeCut: z.record(z.string()), nodes: z.record(z.object({ id: z.string(), title: z.string(), stage: z.string().min(1), parentId: z.string().nullable().optional(), artifacts: record, metadata: z.object({ createdAt: z.string(), status: z.enum(['idle', 'generating', 'ready', 'error']) }).passthrough() }).passthrough()),
}).passthrough();
export function validateProject(project: FilmProject, previous?: FilmProject) {
    projectSchema.parse(project);
    const error = (message: string) => { throw Object.assign(new Error(message), { statusCode: 400 }); };
    if (new Set(project.scenes.map(s => s.id)).size !== project.scenes.length)
        error('Scene IDs must be unique');
    for (const [id, node] of Object.entries(project.nodes)) {
        if (node.id !== id || (node.parentId && !project.nodes[node.parentId]))
            error('Node identity or parent is invalid');
        const seen = new Set<string>();
        let current: any = node;
        while (current) {
            if (seen.has(current.id))
                error('Graph cycles are not allowed');
            seen.add(current.id);
            current = project.nodes[current.parentId];
        }
    }
    for (const [sceneId, nodeId] of Object.entries(project.activeCut))
        if (!project.scenes.some(s => s.id === sceneId) || !project.nodes[nodeId])
            error('Active cut must reference an existing scene and node');
    const accepted: NonNullable<FilmProject['edges']> = {};
    for (const [id, edge] of Object.entries(project.edges || {})) {
        const source = project.nodes[edge.sourceNodeId];
        const target = project.nodes[edge.targetNodeId];
        if (edge.id !== id || !source || !target)
            error('Edge references an unknown node');
        if (wouldCreateCycle(edge.sourceNodeId, edge.targetNodeId, accepted))
            error('Graph cycles are not allowed');
        const output = source.outputPorts?.[edge.sourcePortId];
        const input = target.inputPorts?.[edge.targetPortId];
        const old = previous?.edges?.[id];
        const unchanged = old && old.sourceNodeId === edge.sourceNodeId && old.targetNodeId === edge.targetNodeId && old.sourcePortId === edge.sourcePortId && old.targetPortId === edge.targetPortId;
        if (previous?.schemaVersion === 3 && !unchanged && (!output || !input || output.type !== input.type))
            error('Edge ports are missing or incompatible');
        accepted[id] = edge;
    }
}
