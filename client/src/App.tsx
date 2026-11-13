import { useState, useEffect } from 'react';
import { FilmProject, AgentPresence, ModelEngine } from './types.js';
import { VersionTreeCanvas } from './components/tree/VersionTreeCanvas.js';
import { MultiSceneTimeline } from './components/timeline/MultiSceneTimeline.js';
import { A2UIInspector } from './components/inspector/A2UIInspector.js';
import { TasteMixerModal } from './components/taste/TasteMixerModal.js';
import { DaVinciExportModal } from './components/export/DaVinciExportModal.js';
import { MediaTrimmerModal } from './components/trimmer/MediaTrimmerModal.js';
import { CommandPalette } from './components/palette/CommandPalette.js';
import { ThemeCustomizer, StudioTheme, StudioLayout } from './components/ui-ux/ThemeCustomizer.js';
import { Sliders, Film, Command as CmdIcon, Video } from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<FilmProject | null>(null);
  const [agents, setAgents] = useState<AgentPresence[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [streamingLog, setStreamingLog] = useState<string>('');

  // Modals
  const [isTasteMixerOpen, setIsTasteMixerOpen] = useState(false);
  const [isDaVinciExportOpen, setIsDaVinciExportOpen] = useState(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const [trimmerData, setTrimmerData] = useState<{ isOpen: boolean; fileName: string; targetDurationSec: number; nodeId: string } | null>(null);

  // Meta UI/UX
  const [theme, setTheme] = useState<StudioTheme>('studio-dark');
  const [layout, setLayout] = useState<StudioLayout>('balanced-nle');

  // Load project on mount
  useEffect(() => {
    fetch('/api/project')
      .then((res) => res.json())
      .then((data: FilmProject) => {
        setProject(data);
        const firstNodeId = Object.keys(data.nodes)[0];
        if (firstNodeId) setSelectedNodeId(firstNodeId);
      })
      .catch((err) => console.error('Failed to load project:', err));
  }, []);

  // Connect to AG-UI WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/ag-ui`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'agent:presence') {
            setAgents((prev) => {
              const filtered = prev.filter((a) => a.agentId !== msg.data.agentId);
              return [...filtered, msg.data];
            });
          } else if (msg.event === 'agent:stream_delta') {
            setStreamingLog((prev) => `${prev}\n${msg.data.chunk}`);
          } else if (msg.event === 'state:timeline_sync') {
            setProject((prev) => (prev ? { ...prev, activeCut: { ...prev.activeCut, ...msg.data.activeCut } } : prev));
          }
        } catch {
          // ignore parse errors
        }
      };
    } catch (e) {
      console.warn('WebSocket connection not ready yet:', e);
    }

    return () => {
      ws?.close();
    };
  }, []);

  const handleBranchNode = async (parentNodeId: string) => {
    if (!project) return;
    const parent = project.nodes[parentNodeId];
    const versionLabel = `v${Object.keys(project.nodes).length + 1}.0 Alternate`;

    try {
      const res = await fetch('/api/tree/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentNodeId,
          versionLabel,
          prompt: `Iterate on: ${parent.prompt}`,
          modelEngine: parent.modelEngine,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProject(data.project);
        setSelectedNodeId(data.node.id);
      }
    } catch (err: any) {
      alert(`Branching failed: ${err.message}`);
    }
  };

  const handleSetActiveCut = async (sceneId: string, nodeId: string) => {
    try {
      const res = await fetch('/api/tree/active-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, nodeId }),
      });
      const data = await res.json();
      if (data.success && project) {
        setProject({ ...project, activeCut: data.activeCut });
      }
    } catch (err: any) {
      alert(`Setting active cut failed: ${err.message}`);
    }
  };

  const handleExecuteSkill = async (skillId: string, modelEngine: ModelEngine, input: any) => {
    if (!selectedNodeId) return;
    setStreamingLog(`[Dispatching ${modelEngine}...]`);

    try {
      const res = await fetch('/api/skills/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId,
          modelEngine,
          input,
          targetNodeId: selectedNodeId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh project
        const pRes = await fetch('/api/project');
        const pData = await pRes.json();
        setProject(pData);
      } else {
        alert(`Skill error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Skill execution failed: ${err.message}`);
    }
  };

  const handleMediaDrop = (nodeId: string, file: File) => {
    setTrimmerData({
      isOpen: true,
      fileName: file.name,
      targetDurationSec: 3.5,
      nodeId,
    });
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0D14] text-slate-400 font-mono text-xs">
        Loading Visual AI Video Studio...
      </div>
    );
  }

  const selectedNode = selectedNodeId ? project.nodes[selectedNodeId] || null : null;
  const totalDuration = project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0);

  return (
    <div className={`flex flex-col h-screen w-screen bg-[#0A0D14] text-[#F8FAFC] overflow-hidden theme-${theme}`}>
      {/* Top Studio Navbar */}
      <header className="flex items-center justify-between px-4 h-12 bg-[#0E131F] border-b border-slate-800 shrink-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Video className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-xs tracking-wide text-white">
              VISUAL AI STUDIO
            </span>
          </div>

          <span className="text-slate-600">|</span>

          <span className="text-xs font-semibold text-slate-300">
            {project.name}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
            {project.aspectRatio} • {totalDuration}s
          </span>
        </div>

        {/* Center / Right Control Strip */}
        <div className="flex items-center gap-2">
          <ThemeCustomizer
            currentTheme={theme}
            onThemeChange={setTheme}
            currentLayout={layout}
            onLayoutChange={setLayout}
          />

          <button
            onClick={() => setIsTasteMixerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0A0D14] border border-slate-800 hover:border-amber-400/50 text-slate-200 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Taste & Style (`STYLE.md`)</span>
          </button>

          <button
            onClick={() => setIsDaVinciExportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 shadow transition"
          >
            <Film className="w-3.5 h-3.5 fill-slate-950" />
            <span>Export DaVinci Bundle</span>
          </button>

          <button
            onClick={() => setIsCmdPaletteOpen(true)}
            className="p-1.5 rounded-lg bg-[#0A0D14] border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Command Palette (Cmd+K)"
          >
            <CmdIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane: Version Tree Canvas (DAG) */}
        <div className={layout === 'canvas-focus' ? 'flex-1 h-full' : 'w-[58%] h-full border-r border-slate-800'}>
          <VersionTreeCanvas
            project={project}
            agents={agents}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onBranchNode={handleBranchNode}
            onSetActiveCut={handleSetActiveCut}
            onMediaDrop={handleMediaDrop}
          />
        </div>

        {/* Right Split: Timeline / Player (Top) & A2UI Inspector (Bottom) */}
        {layout !== 'canvas-focus' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="h-[48%] min-h-[260px]">
              <MultiSceneTimeline
                project={project}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <A2UIInspector
                node={selectedNode}
                onUpdatePrompt={(id, prompt) => {
                  if (project.nodes[id]) {
                    project.nodes[id].prompt = prompt;
                  }
                }}
                onExecuteSkill={handleExecuteSkill}
                streamingLog={streamingLog}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modals & Dialogs */}
      <TasteMixerModal
        isOpen={isTasteMixerOpen}
        onClose={() => setIsTasteMixerOpen(false)}
        styleMarkdown={project.styleMarkdown}
        onSaveStyle={(styleMd) => {
          setProject({ ...project, styleMarkdown: styleMd });
        }}
      />

      <DaVinciExportModal
        isOpen={isDaVinciExportOpen}
        onClose={() => setIsDaVinciExportOpen(false)}
        projectName={project.name}
        totalDurationSec={totalDuration}
      />

      {trimmerData && (
        <MediaTrimmerModal
          isOpen={trimmerData.isOpen}
          onClose={() => setTrimmerData(null)}
          fileName={trimmerData.fileName}
          targetDurationSec={trimmerData.targetDurationSec}
          onConfirmTrim={(start, dur) => {
            alert(`Trimmed ${trimmerData.fileName} from ${start}s for ${dur}s and attached to node!`);
          }}
        />
      )}

      <CommandPalette
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        onOpenTasteMixer={() => setIsTasteMixerOpen(true)}
        onOpenDaVinciExport={() => setIsDaVinciExportOpen(true)}
        onBranchSelected={() => selectedNodeId && handleBranchNode(selectedNodeId)}
        onSelectModel={(engine) => {
          if (selectedNodeId && project.nodes[selectedNodeId]) {
            project.nodes[selectedNodeId].modelEngine = engine;
          }
        }}
        onToggleSafeAreas={() => {}}
      />
    </div>
  );
}
