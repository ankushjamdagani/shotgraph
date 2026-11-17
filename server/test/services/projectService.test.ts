vi.mock('../../src/services/fileSafety.js', async () => {
 const actual = await vi.importActual<any>('../../src/services/fileSafety.js');
 return {...actual, moveToTrash: async (file:string) => fs.rename(file, file+'.trashed')};
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ProjectRegistry } from '../../src/services/projectRegistry.js';
import { ProjectService } from '../../src/services/projectService.js';

describe('ProjectService DAG and Folder Management', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video_studio_test_'));
  });

  it('preserves the selected prose concept in the idea node without generating scenes', async () => {
    const concept = 'A traveler reconnects with their hometown through an unexpected encounter.';
    const project = await ProjectService.initProject(tempDir, 'Story concept', {
      initGit: false,
      genesisConfig: { customSpecs: 'Keep all dialogue in French.', branches: [{ id: 1, title: 'Home again', aesthetic: 'Editorial 35mm', summary: 'An unexpected reunion.', story: concept }] },
    });
    expect(project.scenes).toEqual([]);
    const idea = Object.values(project.nodes).find(node => node.stage === 'ideation');
    expect(idea?.prompt).toBe(concept);
    expect(idea?.artifacts?.textContent).toContain(concept);
    expect(idea?.artifacts?.textContent).toContain('Extra project instructions: Keep all dialogue in French.');
    expect((await ProjectService.loadProject(tempDir)).nodes[idea!.id].prompt).toBe(concept);
  });

  it('duplicates project state and media independently without copying repository content', async () => {
    const sourceRoot = path.join(tempDir, 'source');
    const source = await ProjectService.initProject(sourceRoot, 'Original', { initGit: false });
    await fs.writeFile(path.join(sourceRoot, 'assets', 'clip.mp4'), 'original footage');
    await fs.writeFile(path.join(sourceRoot, 'unrelated.txt'), 'not project content');
    const before = (await ProjectRegistry.listRecentProjects()).find(p => p.id === source.id)!;
    const copy = await ProjectService.duplicateProject(sourceRoot);
    const after = (await ProjectRegistry.listRecentProjects()).find(p => p.id === source.id)!;
    expect(after.lastOpenedAt).toBe(before.lastOpenedAt);
    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toBe('Original copy');
    expect(copy.projectRoot).not.toBe(sourceRoot);
    expect(copy.nodes).toEqual(source.nodes);
    expect((await ProjectService.loadProject(copy.projectRoot)).id).toBe(copy.id);
    await fs.writeFile(path.join(copy.projectRoot, 'assets', 'clip.mp4'), 'changed copy');
    expect(await fs.readFile(path.join(sourceRoot, 'assets', 'clip.mp4'), 'utf8')).toBe('original footage');
    await expect(fs.access(path.join(copy.projectRoot, 'unrelated.txt'))).rejects.toThrow();
    expect((await ProjectService.loadProject(sourceRoot)).name).toBe('Original');
  });

  it('rejects linked content and cleans up an incomplete copy', async () => {
    const sourceRoot = path.join(tempDir, 'source');
    await ProjectService.initProject(sourceRoot, 'Original', { initGit: false });
    await fs.writeFile(path.join(tempDir, 'outside.txt'), 'private');
    await fs.symlink(path.join(tempDir, 'outside.txt'), path.join(sourceRoot, 'assets', 'linked.txt'));
    await expect(ProjectService.duplicateProject(sourceRoot)).rejects.toThrow('symbolic link');
    expect((await fs.readdir(tempDir)).filter(name => name.startsWith('source-copy-'))).toEqual([]);
    expect(await fs.readFile(path.join(tempDir, 'outside.txt'), 'utf8')).toBe('private');
  });

  it('initializes a self-contained Git-native project folder structure', async () => {
    const project = await ProjectService.initProject(tempDir, 'Test Video Project');

    expect(project.name).toBe('Test Video Project');
    expect(project.scenes.length).toBe(4);
    expect(project.nodes['node_idea_01']).toBeDefined();
    expect(project.nodes['node_idea_01'].stage).toBe('ideation');
    expect(project.nodes['node_taste_01'].stage).toBe('taste');
    expect(Object.keys(project.nodes).length).toBe(11);
    expect(project.styleMarkdown).toContain('PROJECT STYLE GUIDE');

    // Verify subdirectories exist
    const stats1 = await fs.stat(path.join(tempDir, 'raw_footage'));
    const stats2 = await fs.stat(path.join(tempDir, 'exports', 'davinci_bundle'));
    const stats3 = await fs.stat(path.join(tempDir, '.studio', 'project.json'));

    expect(stats1.isDirectory()).toBe(true);
    expect(stats2.isDirectory()).toBe(true);
    expect(stats3.isFile()).toBe(true);
  });

  it('branches an existing version node into a new parallel DAG node', async () => {
    const project = await ProjectService.initProject(tempDir, 'Branch Test');
    const parentNodeId = Object.keys(project.nodes)[0];

    const newNode = await ProjectService.branchVersionNode(
      project,
      parentNodeId,
      'v2.0 (Humorous Hook)',
      'Make this hook much funnier and punchy',
      'claude-cli'
    );

    expect(newNode.parentId).toBe(parentNodeId);
    expect(newNode.versionLabel).toBe('v2.0 (Humorous Hook)');
    expect(newNode.modelEngine).toBe('claude-cli');
    expect(project.nodes[newNode.id]).toBeDefined();

    // Verify state persisted to disk
    const reloaded = await ProjectService.loadProject(tempDir);
    expect(reloaded.nodes[newNode.id]).toBeDefined();
  });

  it('updates the active timeline cut mapping for a scene', async () => {
    const project = await ProjectService.initProject(tempDir, 'Cut Test');
    const sceneId = 'scene_01';
    const newNode = await ProjectService.branchVersionNode(
      project,
      project.activeCut[sceneId],
      'v2.0 Alternate',
      'Alternate cut'
    );

    await ProjectService.setActiveCutNode(project, sceneId, newNode.id);
    expect(project.activeCut[sceneId]).toBe(newNode.id);

    const reloaded = await ProjectService.loadProject(tempDir);
    expect(reloaded.activeCut[sceneId]).toBe(newNode.id);
  });

  it('deletes a version node from DAG and re-parents downstream children', async () => {
    const project = await ProjectService.initProject(tempDir, 'Delete Node DAG Test');
    const childNode = await ProjectService.branchVersionNode(
      project,
      'node_scene_01_v1',
      'v2.0 Test Child',
      'Test child prompt'
    );
    expect(childNode.parentId).toBe('node_scene_01_v1');

    // Delete node_scene_01_v1 without deleting files
    const updated = await ProjectService.deleteVersionNode(project, 'node_scene_01_v1', false);
    expect(updated.nodes['node_scene_01_v1']).toBeUndefined();
    // childNode parentId should be re-parented to node_scene_01_v1's parent (node_idea_01)
    expect(updated.nodes[childNode.id].parentId).toBe('node_idea_01');
  });

  it('deletes a version node and purges associated media files from system when deleteFilesFromSystem=true', async () => {
    const project = await ProjectService.initProject(tempDir, 'Delete Node System Test');
    
    // Create a dummy video artifact file in the project folder
    const dummyAssetRel = path.join('assets', 'video_clips', 'test_clip_to_delete.mp4');
    const dummyAssetAbs = path.join(tempDir, dummyAssetRel);
    await fs.mkdir(path.dirname(dummyAssetAbs), { recursive: true });
    await fs.writeFile(dummyAssetAbs, 'fake video content');
    
    const nodeWithMedia = await ProjectService.branchVersionNode(
      project,
      'node_footage_01',
      'Take 99 Delete Test',
      'Prompt'
    );
    nodeWithMedia.artifacts = {
      mediaUrl: dummyAssetRel,
    };
    project.nodes[nodeWithMedia.id] = nodeWithMedia;
    await ProjectService.saveProject(project);

    // Verify dummy asset exists before deletion
    expect(await fs.stat(dummyAssetAbs)).toBeDefined();

    // Call deleteVersionNode with deleteFilesFromSystem = true
    await ProjectService.deleteVersionNode(project, nodeWithMedia.id, true);

    // Node should be removed from DAG
    expect(project.nodes[nodeWithMedia.id]).toBeUndefined();

    // File on disk should be removed / trashed
    let fileExists = true;
    try {
      await fs.stat(dummyAssetAbs);
    } catch {
      fileExists = false;
    }
    expect(fileExists).toBe(false);
  });
});
