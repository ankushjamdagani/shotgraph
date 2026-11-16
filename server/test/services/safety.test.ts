import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProjectService } from '../../src/services/projectService.js';
import { ProjectRegistry } from '../../src/services/projectRegistry.js';
import { containedPath } from '../../src/services/fileSafety.js';
vi.mock('../../src/services/fileSafety.js', async () => ({ ...await vi.importActual<any>('../../src/services/fileSafety.js'), moveToTrash: vi.fn().mockRejectedValue(new Error('Trash unavailable')) }));
describe('Project integrity', () => {
    it('does not create missing projects or replace corrupt state', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-safety-'));
        try {
            await expect(ProjectService.loadProject(path.join(root, 'missing'))).rejects.toThrow('not found');
            await expect(fs.stat(path.join(root, 'missing'))).rejects.toThrow();
            await fs.mkdir(path.join(root, '.studio'));
            await fs.writeFile(path.join(root, '.studio/project.json'), '{bad');
            await expect(ProjectService.loadProject(root)).rejects.toThrow('preserved');
            expect(await fs.readFile(path.join(root, '.studio/project.json'), 'utf8')).toBe('{bad');
        }
        finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    });
    it('rejects stale saves, retains a backup, and prevents accidental reinitialization', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-save-'));
        try {
            const first = await ProjectService.initProject(root, 'Original', { initGit: false });
            const stale = await ProjectService.loadProject(root);
            first.name = 'Saved';
            await ProjectService.saveProject(first);
            stale.name = 'Lost update';
            await expect(ProjectService.saveProject(stale)).rejects.toThrow('another session');
            expect((await ProjectService.loadProject(root)).name).toBe('Saved');
            expect(JSON.parse(await fs.readFile(path.join(root, '.studio/project.json.bak'), 'utf8')).name).toBe('Original');
            await expect(ProjectService.initProject(root, 'Overwrite', { initGit: false })).rejects.toThrow('already exists');
        }
        finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    });
    it('retains project and node files when Trash fails', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-trash-'));
        try {
            const project = await ProjectService.initProject(root, 'Keep me', { initGit: false });
            await expect(ProjectRegistry.removeProject(project.id, true)).rejects.toThrow('Trash unavailable');
            expect(await ProjectRegistry.getProjectEntry(project.id)).not.toBeNull();
            const node = Object.values(project.nodes)[0];
            node.artifacts.mediaUrl = 'assets/keep.mp4';
            await fs.writeFile(path.join(root, 'assets/keep.mp4'), 'keep');
            await expect(ProjectService.deleteVersionNode(project, node.id, true)).rejects.toThrow('Trash unavailable');
            expect(project.nodes[node.id]).toBeDefined();
            expect(await fs.readFile(path.join(root, 'assets/keep.mp4'), 'utf8')).toBe('keep');
        }
        finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    });
    it('rejects sibling prefix and traversal paths', () => {
        expect(() => containedPath('/tmp/studio', '../studio-other/private')).toThrow();
        expect(() => containedPath('/tmp/studio', '../../private')).toThrow();
        expect(containedPath('/tmp/studio', 'assets/a.mp4')).toBe('/tmp/studio/assets/a.mp4');
    });
});
