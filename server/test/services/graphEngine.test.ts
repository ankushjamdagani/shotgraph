import { describe, it, expect } from 'vitest';
import {
  wouldCreateCycle,
  getTopologicalOrder,
  getActiveLineageNodeIds,
  getDefaultPortsForType,
  GraphEdge,
  UniversalGraphNode,
} from '../../src/services/graphEngine.js';
import { ProjectMigrationService } from '../../src/services/projectMigrationService.js';

describe('Universal Graph Engine', () => {
  it('detects cycles and rejects self-loops or circular references', () => {
    const edges: Record<string, GraphEdge> = {
      'e1': { id: 'e1', sourceNodeId: 'node_a', sourcePortId: 'out', targetNodeId: 'node_b', targetPortId: 'in' },
      'e2': { id: 'e2', sourceNodeId: 'node_b', sourcePortId: 'out', targetNodeId: 'node_c', targetPortId: 'in' },
    };

    // Self loop
    expect(wouldCreateCycle('node_a', 'node_a', edges)).toBe(true);

    // Forward edge (valid)
    expect(wouldCreateCycle('node_c', 'node_d', edges)).toBe(false);

    // Backward edge causing cycle (node_c -> node_a would create a -> b -> c -> a)
    expect(wouldCreateCycle('node_c', 'node_a', edges)).toBe(true);

    // Adding to an isolated branch
    expect(wouldCreateCycle('node_b', 'node_d', edges)).toBe(false);
  });

  it('computes deterministic topological execution order', () => {
    const nodes: Record<string, UniversalGraphNode> = {
      'idea': { id: 'idea', title: 'Idea', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
      'taste': { id: 'taste', title: 'Taste', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
      'script': { id: 'script', title: 'Script', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
      'shot': { id: 'shot', title: 'Shot', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
      'assembly': { id: 'assembly', title: 'Assembly', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
    };

    const edges: Record<string, GraphEdge> = {
      'e1': { id: 'e1', sourceNodeId: 'idea', sourcePortId: 'out', targetNodeId: 'taste', targetPortId: 'in' },
      'e2': { id: 'e2', sourceNodeId: 'taste', sourcePortId: 'out', targetNodeId: 'script', targetPortId: 'in' },
      'e3': { id: 'e3', sourceNodeId: 'script', sourcePortId: 'out', targetNodeId: 'shot', targetPortId: 'in' },
      'e4': { id: 'e4', sourceNodeId: 'shot', sourcePortId: 'out', targetNodeId: 'assembly', targetPortId: 'in' },
    };

    const order = getTopologicalOrder(nodes, edges);
    expect(order).toEqual(['idea', 'taste', 'script', 'shot', 'assembly']);
  });

  it('traces ancestral active lineage from terminal sink ("The Red Thread")', () => {
    const nodes: Record<string, UniversalGraphNode> = {
      'root_idea': { id: 'root_idea', title: 'Idea', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
      'taste_a': { id: 'taste_a', title: 'Taste A (Active)', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
      'taste_b': { id: 'taste_b', title: 'Taste B (Alternative)', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
      'script_a': { id: 'script_a', title: 'Script A', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
      'script_b': { id: 'script_b', title: 'Script B', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
      'sink_video': { id: 'sink_video', title: 'Video Assembly', versionLabel: 'v1', position: { x: 0, y: 0 }, artifacts: {} },
    };

    const edges: Record<string, GraphEdge> = {
      'e1': { id: 'e1', sourceNodeId: 'root_idea', sourcePortId: 'out', targetNodeId: 'taste_a', targetPortId: 'in' },
      'e2': { id: 'e2', sourceNodeId: 'root_idea', sourcePortId: 'out', targetNodeId: 'taste_b', targetPortId: 'in' },
      'e3': { id: 'e3', sourceNodeId: 'taste_a', sourcePortId: 'out', targetNodeId: 'script_a', targetPortId: 'in' },
      'e4': { id: 'e4', sourceNodeId: 'taste_b', sourcePortId: 'out', targetNodeId: 'script_b', targetPortId: 'in' },
      'e5': { id: 'e5', sourceNodeId: 'script_a', sourcePortId: 'out', targetNodeId: 'sink_video', targetPortId: 'in' },
    };

    // Lineage from sink_video should include root_idea, taste_a, script_a, sink_video (NOT taste_b or script_b!)
    const activeLineage = getActiveLineageNodeIds('sink_video', nodes, edges);
    expect(activeLineage).toContain('root_idea');
    expect(activeLineage).toContain('taste_a');
    expect(activeLineage).toContain('script_a');
    expect(activeLineage).toContain('sink_video');
    expect(activeLineage).not.toContain('taste_b');
    expect(activeLineage).not.toContain('script_b');
  });

  it('assigns standard typed ports based on node type', () => {
    const previsPorts = getDefaultPortsForType('previs.threejs');
    expect(previsPorts.inputPorts['in_shot']).toBeDefined();
    expect(previsPorts.inputPorts['in_spatial']).toBeDefined();
    expect(previsPorts.inputPorts['in_audio']).toBeDefined();
    expect(previsPorts.outputPorts['out_media']).toBeDefined();
    expect(previsPorts.outputPorts['out_spatial']).toBeDefined();
    expect(previsPorts.outputPorts['out_code']).toBeDefined();
  });
});

describe('Project Migration Service (V2 to V3)', () => {
  it('migrates legacy single-parent projects into typed graph with explicit edges', () => {
    const legacyProject = {
      id: 'legacy_proj_01',
      name: 'Legacy Commercial',
      projectRoot: '/tmp/test_project',
      targetDurationSec: 30,
      aspectRatio: '9:16',
      fps: 30,
      scenes: [{ id: 'scene_01', name: 'Scene 1', order: 1, targetDurationSec: 10 }],
      activeCut: { scene_01: 'node_footage_01' },
      nodes: {
        'node_idea_01': {
          id: 'node_idea_01',
          parentId: null,
          stage: 'ideation',
          title: 'Core Idea',
          versionLabel: 'v1.0',
          position: { x: 100, y: 100 },
          artifacts: {},
        },
        'node_taste_01': {
          id: 'node_taste_01',
          parentId: 'node_idea_01',
          stage: 'taste',
          title: 'Director Taste',
          versionLabel: 'v1.0',
          position: { x: 400, y: 100 },
          artifacts: {},
        },
        'node_asset_lead': {
          id: 'node_asset_lead',
          parentId: 'node_taste_01',
          stage: 'assets',
          title: 'Lead Presenter',
          subjectAnchorId: 'subj_lead',
          versionLabel: 'v1.0',
          position: { x: 400, y: 350 },
          artifacts: {},
        },
        'node_shot_01': {
          id: 'node_shot_01',
          parentId: 'node_taste_01',
          stage: 'shot',
          title: 'Shot 1.1',
          versionLabel: 'v1.0',
          position: { x: 700, y: 100 },
          boundSubjectAnchorIds: ['subj_lead'],
          artifacts: {},
        },
        'node_assembly_01': {
          id: 'node_assembly_01',
          parentId: 'node_shot_01',
          stage: 'assembly',
          title: 'Master Cut',
          versionLabel: 'v1.0',
          position: { x: 1000, y: 100 },
          artifacts: {},
        },
      },
    };

    const migrated = ProjectMigrationService.migrateProjectV2toV3(legacyProject);

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.activeSinkNodeId).toBe('node_assembly_01');
    expect(migrated.edges).toBeDefined();

    // Check primary parent-child edges were synthesized
    expect(migrated.edges['edge_node_idea_01_to_node_taste_01']).toBeDefined();
    expect(migrated.edges['edge_node_taste_01_to_node_shot_01']).toBeDefined();
    expect(migrated.edges['edge_node_shot_01_to_node_assembly_01']).toBeDefined();

    // Check asset binding edge was synthesized
    expect(migrated.edges['edge_asset_node_asset_lead_to_node_shot_01']).toBeDefined();
    expect(migrated.edges['edge_asset_node_asset_lead_to_node_shot_01'].type).toBe('asset_binding');

    // Check nodes received typed ports
    expect(migrated.nodes['node_idea_01'].type).toBe('creative.idea');
    expect(migrated.nodes['node_idea_01'].outputPorts?.['out_story']).toBeDefined();
    expect(migrated.nodes['node_shot_01'].type).toBe('cinematography.shot');
    expect(migrated.nodes['node_shot_01'].inputPorts?.['in_story']).toBeDefined();
  });
});
