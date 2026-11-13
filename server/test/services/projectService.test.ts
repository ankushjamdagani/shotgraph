import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ProjectService } from '../../src/services/projectService.js';

describe('ProjectService DAG and Folder Management', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video_studio_test_'));
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
});
