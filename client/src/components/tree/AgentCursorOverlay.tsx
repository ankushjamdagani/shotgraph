import React from 'react';
import { AgentPresence } from '../../types.js';
import { Bot, Sparkles, Loader2 } from 'lucide-react';

interface AgentCursorOverlayProps {
  agents: AgentPresence[];
}

export const AgentCursorOverlay: React.FC<AgentCursorOverlayProps> = ({ agents }) => {
  const activeAgents = agents.filter((a) => a.status !== 'idle');

  if (activeAgents.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-none">
      {activeAgents.map((agent) => (
        <div
          key={agent.agentId}
          style={{ borderColor: agent.color }}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#0A0D14]/90 border shadow-xl backdrop-blur-md animate-fade-in"
        >
          <div
            style={{ backgroundColor: agent.color }}
            className="w-2.5 h-2.5 rounded-full animate-ping"
          />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Bot className="w-3.5 h-3.5" style={{ color: agent.color }} />
            <span>{agent.name}</span>
          </div>

          <div className="text-[11px] text-slate-400 border-l border-slate-700 pl-2 flex items-center gap-1">
            {agent.status === 'thinking' && <Loader2 className="w-3 h-3 animate-spin text-sky-400" />}
            {agent.status === 'generating' && <Sparkles className="w-3 h-3 text-amber-400" />}
            <span className="truncate max-w-[200px]">{agent.activityMessage}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
