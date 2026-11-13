import { z } from 'zod';

/**
 * AG-UI Protocol (Agent-User Interaction Protocol)
 * Event specifications for bi-directional communication between
 * AI agent swarms and the video studio frontend.
 */

// 1. Agent Presence & Cursor Location
export const AgentPresenceSchema = z.object({
  agentId: z.string(),
  name: z.string(), // e.g. "Antigravity Director", "Claude Motion", "Ollama Script"
  modelEngine: z.enum(['antigravity-cli', 'claude-cli', 'ollama', 'hyperframes', 'ffmpeg', 'external']),
  color: z.string(), // Hex color for cursor and badges, e.g. "#38BDF8"
  activeNodeId: z.string().nullable(), // The DAG node currently being inspected or edited
  targetTimelineBlockId: z.string().nullable(),
  status: z.enum(['idle', 'thinking', 'generating', 'rendering', 'error']),
  activityMessage: z.string(), // e.g. "Drafting Scene 2 punchy hook..."
  updatedAt: z.number(),
});
export type AgentPresence = z.infer<typeof AgentPresenceSchema>;

// 2. Real-Time Streaming Thought & Text Deltas
export const StreamDeltaSchema = z.object({
  sessionId: z.string(),
  agentId: z.string(),
  nodeId: z.string(),
  type: z.enum(['thought', 'text', 'code', 'log']),
  chunk: z.string(),
  timestamp: z.number(),
});
export type StreamDelta = z.infer<typeof StreamDeltaSchema>;

// 3. Human-In-The-Loop Approval Request & Response
export const HumanApprovalRequestSchema = z.object({
  requestId: z.string(),
  agentId: z.string(),
  nodeId: z.string(),
  actionType: z.enum(['cut_dead_air', 're_render', 'apply_style', 'delete_branch', 'export_resolve']),
  description: z.string(),
  proposedDiff: z.record(z.any()), // Details of the change proposed
  timestamp: z.number(),
});
export type HumanApprovalRequest = z.infer<typeof HumanApprovalRequestSchema>;

export const HumanApprovalResponseSchema = z.object({
  requestId: z.string(),
  approved: z.boolean(),
  userFeedback: z.string().optional(),
  timestamp: z.number(),
});
export type HumanApprovalResponse = z.infer<typeof HumanApprovalResponseSchema>;

// 4. Studio State Synchronization
export const TimelineCutSyncSchema = z.object({
  projectId: z.string(),
  activeCut: z.record(z.string(), z.string()), // sceneId -> versionNodeId
  playheadSec: z.number(),
  isPlaying: z.boolean(),
  updatedBy: z.string(),
});
export type TimelineCutSync = z.infer<typeof TimelineCutSyncSchema>;

// Union of all AG-UI Server-to-Client Events
export const AGUIServerMessageSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('agent:presence'),
    data: AgentPresenceSchema,
  }),
  z.object({
    event: z.literal('agent:stream_delta'),
    data: StreamDeltaSchema,
  }),
  z.object({
    event: z.literal('approval:request'),
    data: HumanApprovalRequestSchema,
  }),
  z.object({
    event: z.literal('state:timeline_sync'),
    data: TimelineCutSyncSchema,
  }),
  z.object({
    event: z.literal('project:file_changed'),
    data: z.object({
      path: z.string(),
      changeType: z.enum(['add', 'change', 'unlink']),
      timestamp: z.number(),
    }),
  }),
]);
export type AGUIServerMessage = z.infer<typeof AGUIServerMessageSchema>;

// Union of all AG-UI Client-to-Server Events
export const AGUIClientMessageSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('approval:response'),
    data: HumanApprovalResponseSchema,
  }),
  z.object({
    event: z.literal('user:navigate_node'),
    data: z.object({
      nodeId: z.string(),
    }),
  }),
  z.object({
    event: z.literal('timeline:scrub'),
    data: z.object({
      playheadSec: z.number(),
    }),
  }),
  z.object({
    event: z.literal('agent:dispatch'),
    data: z.object({
      skillId: z.string(),
      nodeId: z.string(),
      modelEngine: z.enum(['antigravity-cli', 'claude-cli', 'ollama', 'hyperframes', 'ffmpeg']),
      prompt: z.string(),
      context: z.record(z.any()).optional(),
    }),
  }),
]);
export type AGUIClientMessage = z.infer<typeof AGUIClientMessageSchema>;
