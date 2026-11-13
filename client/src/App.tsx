import { useState, useEffect, useCallback } from 'react';
import { FilmProject, AgentPresence } from './types.js';
import { SpatialDirectorCanvas } from './components/canvas/SpatialDirectorCanvas.js';
import { BottomPlaybackDock } from './components/canvas/BottomPlaybackDock.js';
import { TasteMixerModal } from './components/taste/TasteMixerModal.js';
import { DaVinciExportModal } from './components/export/DaVinciExportModal.js';
import { MediaTrimmerModal } from './components/trimmer/MediaTrimmerModal.js';
import { SubjectManagerModal } from './components/project/SubjectManagerModal.js';
import { CommandPalette } from './components/palette/CommandPalette.js';
import { ProjectHubModal } from './components/project/ProjectHubModal.js';
import { ThemeCustomizer, StudioTheme } from './components/ui-ux/ThemeCustomizer.js';
import {
  Sliders,
  Film,
  Command as CmdIcon,
  Video,
  Folder,
  ChevronDown,
  LayoutGrid,
  User,
} from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<FilmProject | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(false);
  const [agents, setAgents] = useState<AgentPresence[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Modals
  const [isProjectHubOpen, setIsProjectHubOpen] = useState(false);
  const [isTasteMixerOpen, setIsTasteMixerOpen] = useState(false);
  const [isSubjectManagerOpen, setIsSubjectManagerOpen] = useState(false);
  const [isDaVinciExportOpen, setIsDaVinciExportOpen] = useState(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const [trimmerData, setTrimmerData] = useState<{
    isOpen: boolean;
    fileName: string;
    targetDurationSec: number;
    nodeId: string;
  } | null>(null);

  // Meta UI/UX
  const [theme, setTheme] = useState<StudioTheme>(() => {
    try {
      const saved = localStorage.getItem('studio_theme');
      if (saved === 'film-lab-mono' || saved === 'midnight-navy' || saved === 'studio-dark') {
        return saved;
      }
    } catch {}
    return 'studio-dark';
  });

  // Apply theme to documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-studio-dark', 'theme-film-lab-mono', 'theme-midnight-navy');
    root.classList.add(`theme-${theme}`);
    try {
      localStorage.setItem('studio_theme', theme);
    } catch {}
  }, [theme]);

  // Load project by ID (only when requested via query param or user selection)
  const loadProjectById = useCallback(async (projectId: string) => {
    setIsLoadingProject(true);
    try {
      const res = await fetch(`http://localhost:3030/api/projects/${projectId}`);
      const data: FilmProject = await res.json();
      if (data && data.id) {
        setProject(data);
        const firstNodeId = Object.keys(data.nodes)[0];
        if (firstNodeId) setSelectedNodeId(firstNodeId);

        // Synchronize URL query parameter without full reload
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('projectId', data.id);
        window.history.replaceState({}, '', newUrl.toString());
      } else {
        // If project ID is invalid, clear query and return to projects hub
        setProject(null);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('projectId');
        window.history.replaceState({}, '', newUrl.pathname);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
      setProject(null);
    } finally {
      setIsLoadingProject(false);
    }
  }, []);

  // Mount logic: check if ?projectId= is provided
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialProjectId = urlParams.get('projectId');
    if (initialProjectId) {
      loadProjectById(initialProjectId);
    }
    // If no initialProjectId, stay on root Projects Hub page (project = null)
  }, [loadProjectById]);

  // Support browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const pid = urlParams.get('projectId');
      if (pid) {
        loadProjectById(pid);
      } else {
        setProject(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadProjectById]);

  // Global Keyboard Shortcuts (Cmd+O for Project Hub, Cmd+K for Command Palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setIsProjectHubOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Connect to Scoped AG-UI WebSocket
  useEffect(() => {
    if (!project?.id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:3030/ws/ag-ui?projectId=${project.id}`;
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
          } else if (msg.event === 'state:timeline_sync') {
            setProject((prev) =>
              prev ? { ...prev, activeCut: { ...prev.activeCut, ...msg.data.activeCut } } : prev
            );
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
  }, [project?.id]);

  const handleSelectProject = (newProject: FilmProject) => {
    setProject(newProject);
    const firstNode = Object.keys(newProject.nodes)[0] || null;
    setSelectedNodeId(firstNode);

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('projectId', newProject.id);
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleExitToProjects = () => {
    setProject(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('projectId');
    window.history.pushState({}, '', newUrl.pathname);
  };

  const handleBranchNode = async (parentNodeId: string) => {
    if (!project) return;
    const parent = project.nodes[parentNodeId];
    const versionLabel = `v${Object.keys(project.nodes).length + 1}.0 Alternate`;

    try {
      const res = await fetch('http://localhost:3030/api/tree/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentNodeId,
          versionLabel,
          prompt: `Iterate on: ${parent.prompt}`,
          modelEngine: parent.modelEngine,
          projectId: project.id,
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
    if (!project) return;
    try {
      const res = await fetch('http://localhost:3030/api/tree/active-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, nodeId, projectId: project.id }),
      });
      const data = await res.json();
      if (data.success && project) {
        setProject({ ...project, activeCut: data.activeCut });
      }
    } catch (err: any) {
      alert(`Setting active cut failed: ${err.message}`);
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

  // If loading a specific project from query param
  if (isLoadingProject) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#0A0D14] text-slate-400 font-mono text-xs gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <Video className="w-5 h-5 animate-pulse" />
        </div>
        <span>Opening project workspace...</span>
      </div>
    );
  }

  // Root view: When on root (no project loaded), show Projects Page directly!
  if (!project) {
    return (
      <ProjectHubModal
        isOpen={true}
        isStandalonePage={true}
        onSelectProject={handleSelectProject}
        currentTheme={theme}
        onThemeChange={setTheme}
      />
    );
  }

  const totalDuration = project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0);

  return (
    <div className={`flex flex-col h-screen w-screen bg-app text-text-primary overflow-hidden theme-${theme}`}>
      {/* Top Studio Navbar */}
      <header className="flex items-center justify-between px-4 h-12 bg-surface border-b border-subtle shrink-0 z-40 select-none">
        <div className="flex items-center gap-3">
          {/* Logo & Return to Projects Page button */}
          <button
            onClick={handleExitToProjects}
            className="flex items-center gap-2 hover:opacity-80 transition group"
            title="Return to Projects Hub"
          >
            <div className="w-6 h-6 rounded-md bg-text-primary text-app font-extrabold text-[11px] flex items-center justify-center font-mono">
              VS
            </div>
            <span className="font-extrabold text-xs tracking-wider text-text-primary group-hover:opacity-80 transition">
              SPATIAL DIRECTOR STUDIO
            </span>
          </button>

          <span className="text-subtle">|</span>

          {/* All Projects Hub Link */}
          <button
            onClick={handleExitToProjects}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-card transition"
            title="Go to Projects Page"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-text-muted" />
            <span>Projects</span>
          </button>

          {/* Active Project Switcher Pill */}
          <button
            onClick={() => setIsProjectHubOpen(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-xl bg-card hover:bg-subtle border border-subtle text-text-primary transition group"
            title="Switch Project (Cmd+O)"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-text-primary transition truncate max-w-[200px]">
              {project.name}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-app text-text-muted border border-subtle">
              {project.aspectRatio} • {totalDuration}s
            </span>
            <ChevronDown className="w-3 h-3 text-text-muted group-hover:text-text-primary" />
          </button>
        </div>

        {/* Center / Right Control Strip */}
        <div className="flex items-center gap-2">
          <ThemeCustomizer
            currentTheme={theme}
            onThemeChange={setTheme}
          />

          <button
            onClick={() => setIsSubjectManagerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-card border border-subtle hover:bg-subtle text-text-primary transition"
          >
            <User className="w-3.5 h-3.5 text-purple-400" />
            <span>Subject Anchors</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-subtle text-purple-300">
              {project.subjectAnchors?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setIsTasteMixerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-card border border-subtle hover:bg-subtle text-text-primary transition"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Taste & Style (`STYLE.md`)</span>
          </button>

          <button
            onClick={() => setIsDaVinciExportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-text-primary text-app hover:opacity-90 shadow transition font-mono"
          >
            <Film className="w-3.5 h-3.5 fill-current" />
            <span>Export DaVinci Bundle</span>
          </button>

          <button
            onClick={() => setIsCmdPaletteOpen(true)}
            className="p-1.5 rounded-xl bg-card border border-subtle text-text-muted hover:text-text-primary transition"
            title="Command Palette (Cmd+K)"
          >
            <CmdIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Spatial Director Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 relative">
          <SpatialDirectorCanvas
            project={project}
            agents={agents}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onBranchNode={handleBranchNode}
            onUpdateProject={(updated) => setProject(updated)}
            onSetActiveCut={handleSetActiveCut}
            onMediaDrop={handleMediaDrop}
            onOpenDaVinciExport={() => setIsDaVinciExportOpen(true)}
            onOpenSubjectManager={() => setIsSubjectManagerOpen(true)}
            onOpenTasteMixer={() => setIsTasteMixerOpen(true)}
          />
        </div>

        {/* Bottom Playback Scrubber Dock */}
        <BottomPlaybackDock
          project={project}
          onOpenDaVinciExport={() => setIsDaVinciExportOpen(true)}
        />
      </main>

      {/* DaVinci-Style Project Hub Modal (Cmd+O when in editor) */}
      <ProjectHubModal
        isOpen={isProjectHubOpen}
        onClose={() => setIsProjectHubOpen(false)}
        currentProjectId={project.id}
        onSelectProject={(newProj) => {
          handleSelectProject(newProj);
          setIsProjectHubOpen(false);
        }}
        isStandalonePage={false}
        currentTheme={theme}
        onThemeChange={setTheme}
      />

      {/* Cascading Taste Mixer Modal */}
      <TasteMixerModal
        isOpen={isTasteMixerOpen}
        onClose={() => setIsTasteMixerOpen(false)}
        project={project}
        onUpdateProject={(updatedProject) => setProject(updatedProject)}
      />

      {/* Project Subject Anchors & Asset Manager Modal */}
      <SubjectManagerModal
        isOpen={isSubjectManagerOpen}
        onClose={() => setIsSubjectManagerOpen(false)}
        project={project}
        onUpdateProject={(updatedProject) => setProject(updatedProject)}
      />

      {/* DaVinci Multi-Track Export Modal */}
      <DaVinciExportModal
        isOpen={isDaVinciExportOpen}
        onClose={() => setIsDaVinciExportOpen(false)}
        projectName={project.name}
        totalDurationSec={totalDuration}
      />

      {/* Media Trimmer Modal */}
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

      {/* Command Palette */}
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
