import { useDialog } from './components/common/useDialog';
import { ProjectReview } from './components/project/ProjectReview';
import { toast } from './services/toastService';
import { apiFetch, sessionToken } from './services/api';
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { FilmProject, AgentPresence } from './types.js';
import { SpatialDirectorCanvas } from './components/canvas/SpatialDirectorCanvas.js';
import { BottomPlaybackDock } from './components/canvas/BottomPlaybackDock.js';
import { CommandPalette } from './components/palette/CommandPalette.js';
import { ProjectHubModal } from './components/project/ProjectHubModal.js';
import { ProjectNameMenu } from './components/project/ProjectNameMenu.js';
import { StudioTheme, ThemeToggle } from './components/ui-ux/ThemeCustomizer.js';
import { StudioErrorBoundary } from './components/common/StudioErrorBoundary.js';

// Lazy-loaded on-demand modals (Vercel rule: bundle-dynamic-imports)
const TasteMixerModal = lazy(() =>
  import('./components/taste/TasteMixerModal.js').then((m) => ({ default: m.TasteMixerModal }))
);
const DaVinciExportModal = lazy(() =>
  import('./components/export/DaVinciExportModal.js').then((m) => ({ default: m.DaVinciExportModal }))
);
const MediaTrimmerModal = lazy(() =>
  import('./components/trimmer/MediaTrimmerModal.js').then((m) => ({ default: m.MediaTrimmerModal }))
);
const SubjectManagerModal = lazy(() =>
  import('./components/project/SubjectManagerModal.js').then((m) => ({ default: m.SubjectManagerModal }))
);
const NewProjectWizard = lazy(() =>
  import('./components/project/NewProjectWizard.js').then((m) => ({ default: m.NewProjectWizard }))
);
const ProjectSettingsModal = lazy(() =>
  import('./components/project/ProjectSettingsModal.js').then((m) => ({ default: m.ProjectSettingsModal }))
);
import {
  Film,
  Command as CmdIcon,
  Video,
  LayoutGrid,
  User,
  Settings,
  Trash2,
} from 'lucide-react';

function App() {
  const [project, setProject] = useState<FilmProject | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(false);
  const loadSequence = useRef(0);
  const [connection, setConnection] = useState('Connecting');
  const [safeAreas, setSafeAreas] = useState(false);
  const [agents, setAgents] = useState<AgentPresence[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Modals
  const [isProjectHubOpen, setIsProjectHubOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isTasteMixerOpen, setIsTasteMixerOpen] = useState(false);
  const [isSubjectManagerOpen, setIsSubjectManagerOpen] = useState(false);
  const [isDaVinciExportOpen, setIsDaVinciExportOpen] = useState(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingActiveProject, setIsDeletingActiveProject] = useState(false);
  const [trimmerData, setTrimmerData] = useState<{
    isOpen: boolean;
    file: File;
    targetDurationSec: number;
    nodeId: string;
  } | null>(null);

  const deleteDialog = useDialog(isDeleteModalOpen,()=>{if(!isDeletingActiveProject)setIsDeleteModalOpen(false);});
  // Meta UI/UX (Only 'film-lab-mono' dark and 'paper-ink' light)
  const [theme, setTheme] = useState<StudioTheme>(() => {
    try {
      const saved = localStorage.getItem('studio_theme');
      if (saved === 'paper-ink' || saved === 'film-lab-mono') {
        return saved;
      }
    } catch {}
    return 'film-lab-mono';
  });

  // Apply theme to documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(
      'theme-studio-dark',
      'theme-film-lab-mono',
      'theme-midnight-navy',
      'theme-cinema-tungsten',
      'theme-paper-ink',
      'theme-studio-daylight',
      'theme-nordic-light'
    );
    root.classList.add(`theme-${theme}`);
    try {
      localStorage.setItem('studio_theme', theme);
    } catch {}
  }, [theme]);

  // Load project by ID (only when requested via query param or user selection)
  const loadProjectById = useCallback(async (projectId: string) => {
    const sequence = ++loadSequence.current;
    setIsLoadingProject(true);
    try {
      const res = await apiFetch(`http://localhost:3030/api/projects/${projectId}`);
      const data: FilmProject = await res.json();
      if (sequence !== loadSequence.current) return;
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
      if (sequence !== loadSequence.current) return;
      toast.error((err as Error).message);
      setProject(null);
      const url = new URL(window.location.href); url.searchParams.delete('projectId'); window.history.replaceState({}, '', url);
    } finally {
      if (sequence === loadSequence.current) setIsLoadingProject(false);
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
        ++loadSequence.current;setSelectedNodeId(null);setProject(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadProjectById]);

  // Global Keyboard Shortcuts (Cmd+O for Project Hub, Cmd+K for Command Palette, Cmd+, for Settings, Cmd+E for DaVinci Export)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('[aria-modal=true]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (!project) window.dispatchEvent(new Event('studio:new-project')); else setIsNewProjectOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setIsProjectHubOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdPaletteOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsProjectSettingsOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsDaVinciExportOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project?.id]);

  // Connect to Scoped AG-UI WebSocket
  useEffect(() => {
    if (!project?.id) return;

    let disposed = false;
    let ws: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const connect = async () => {
      setConnection('Connecting');
      try {
        const token = await sessionToken();
        if (disposed) return;
        ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/ag-ui?projectId=${encodeURIComponent(project.id)}&token=${encodeURIComponent(token)}`);
        ws.onopen = async () => {
          attempts = 0; setConnection('Connected');
          try {const res = await apiFetch(`/api/projects/${project.id}`); const fresh = await res.json();
          if (!disposed) setProject(fresh);}catch{if(!disposed)setConnection('Offline');}
        };
        ws.onmessage = (event) => {
          if (disposed) return;
          let msg; try {msg=JSON.parse(event.data);}catch{return;}
          if (msg.event === 'agent:presence') setAgents(prev => [...prev.filter(a=>a.agentId!==msg.data.agentId),msg.data]);
          if (msg.event === 'state:timeline_sync') setProject(prev => prev ? {...prev,activeCut:{...prev.activeCut,...msg.data.activeCut}}:prev);
          if (msg.event === 'project:updated') setProject(prev => prev?.id===msg.data.id && (prev?.revision||0)<=(msg.data.revision||0)?msg.data:prev);
        };
        ws.onclose = () => { if (!disposed) { setConnection('Reconnecting');setAgents([]);timer=setTimeout(connect,Math.min(15000,1000*2**attempts++)); } };
        ws.onerror = () => ws?.close();
      } catch { if (!disposed) {setConnection('Offline');timer=setTimeout(connect,3000);} }
    };
    connect();
    return () => { disposed=true;clearTimeout(timer);ws?.close(); };
  }, [project?.id]);

  useEffect(() => {
    const saved = (event: Event) => { const next = (event as CustomEvent<FilmProject>).detail; setProject(prev => prev?.id===next.id && (prev?.revision||0)<=(next.revision||0)?next:prev); };
    window.addEventListener('studio:project-saved',saved);
    return () => window.removeEventListener('studio:project-saved',saved);
  }, []);
  useEffect(() => {
    setAgents([]);setTrimmerData(null);setIsProjectSettingsOpen(false);setIsTasteMixerOpen(false);
    setIsSubjectManagerOpen(false);setIsDaVinciExportOpen(false);setIsCmdPaletteOpen(false);setIsDeleteModalOpen(false);
  }, [project?.id]);
  const updateProject = (updated: FilmProject) => setProject(prev => prev?.id === updated.id && (prev?.revision||0) > (updated.revision||0) ? prev : updated);

  const handleSelectProject = (newProject: FilmProject) => {
    ++loadSequence.current;
    setProject(newProject);
    const firstNode = Object.keys(newProject.nodes)[0] || null;
    setSelectedNodeId(firstNode);

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('projectId', newProject.id);
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleExitToProjects = () => {
    ++loadSequence.current;
    setSelectedNodeId(null);
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
      const res = await apiFetch('http://localhost:3030/api/tree/branch', {
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
      toast.error(`Branching failed: ${err.message}`);
    }
  };

  const handleSetActiveCut = async (sceneId: string, nodeId: string) => {
    if (!project) return;
    try {
      const res = await apiFetch('http://localhost:3030/api/tree/active-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, nodeId, projectId: project.id }),
      });
      const data = await res.json();
      if (data.success && project) {
        setProject(data.project);
      }
    } catch (err: any) {
      toast.error(`Setting active cut failed: ${err.message}`);
    }
  };

  const handleMediaDrop = (nodeId: string, file: File) => {
    const node = project?.nodes[nodeId];
    const scene = project?.scenes.find(scene=>scene.id===node?.sceneId);
    setTrimmerData({isOpen:true,file,targetDurationSec:scene?.targetDurationSec || 5,nodeId});
  };

  // If loading a specific project from query param
  if (isLoadingProject) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-app text-text-muted font-mono text-xs gap-3">
        <div className="w-8 h-8 rounded bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary">
          <Video className="w-4 h-4 animate-pulse" />
        </div>
        <span>Loading project...</span>
      </div>
    );
  }

  const handleConfirmDeleteActiveProject = async (moveToTrash: boolean) => {
    if (!project) return;
    setIsDeletingActiveProject(true);
    try {
      const res = await apiFetch(`http://localhost:3030/api/projects/${project.id}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveToTrash }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        handleExitToProjects();
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsDeletingActiveProject(false);
    }
  };

  // Root view: When on root (no project loaded), show Projects Page directly!
  if (!project) {
    return (
      <> <ProjectHubModal
        isOpen={true}
        isStandalonePage={true}
        onSelectProject={handleSelectProject}
        currentTheme={theme}
        onThemeChange={setTheme}
      /></>
    );
  }

  const totalDuration =
    project.scenes && project.scenes.length > 0
      ? project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0)
      : project.targetDurationSec || 30;

  return (
    <div className={`flex flex-col h-screen w-screen bg-app text-text-primary overflow-hidden theme-${theme}`}>
      <div role="status" className="studio-connection px-4 py-1 text-xs bg-surface text-text-muted border-b border-subtle">{connection} · Project connection</div>
      {/* Top Studio Navbar */}
      <header className="studio-header flex items-center justify-between px-4 h-12 bg-surface border-b border-subtle shrink-0 z-40 select-none">
        <div className="flex items-center gap-3">
          {/* Logo & Return to Projects Page button */}
          <button
            onClick={handleExitToProjects}
            className="flex items-center gap-2 px-2 py-1 -ml-1 rounded hover:bg-card/70 transition group active:scale-[0.98]"
            title="Shotgraph — Return to Projects (⌘O)"
          >
            <div className="w-5 h-5 rounded bg-text-primary text-app font-black text-[10px] flex items-center justify-center font-mono tracking-tight shadow-xs">
              SG
            </div>
            <span className="font-extrabold text-xs tracking-wider text-text-primary group-hover:text-text-primary/90 transition">
              SHOTGRAPH
            </span>
          </button>

          <div className="h-4 w-[1px] bg-subtle" />

          {/* All Projects Hub Link */}
          <button
            onClick={handleExitToProjects}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-medium text-text-muted hover:text-text-primary hover:bg-card border border-transparent hover:border-subtle transition active:scale-[0.98]"
            title="Go to Projects (⌘O)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-text-muted" />
            <span>Projects</span>
          </button>

          {/* Active Project Switcher Menu Dropdown */}
          <ProjectNameMenu
            project={project}
            onUpdateProject={updateProject}
            onSelectProject={(newProj) => handleSelectProject(newProj)}
            onOpenProjectSettings={() => setIsProjectSettingsOpen(true)}
            onOpenDaVinciExport={() => setIsDaVinciExportOpen(true)}
            onOpenProjectsHub={() => setIsProjectHubOpen(true)}
            onDeleteProject={() => setIsDeleteModalOpen(true)}
            onOpenNewProject={() => setIsNewProjectOpen(true)}
          />
        </div>

        {/* Center / Right Control Strip */}
        <div className="flex items-center gap-2">
          {/* Theme Icon-Toggle: Light (Paper) & Dark (Film Lab) */}
          <ThemeToggle currentTheme={theme} onThemeChange={setTheme} className="w-7 h-7" />

          <button
            onClick={() => setIsProjectSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-medium bg-card border border-subtle hover:bg-subtle text-text-primary transition active:scale-[0.98]"
            title="Settings (⌘,)"
          >
            <Settings className="w-3.5 h-3.5 text-text-muted" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setIsSubjectManagerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-medium bg-card border border-subtle hover:bg-subtle text-text-primary transition active:scale-[0.98]"
            title="Subjects"
          >
            <User className="w-3.5 h-3.5 text-text-muted" />
            <span>Subjects</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-app text-text-muted border border-subtle">
              {project.subjectAnchors?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setIsDaVinciExportOpen(true)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-bold bg-accent-primary text-app hover:opacity-90 shadow-xs transition active:scale-[0.98]"
            title="Export DaVinci (⌘E)"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setIsCmdPaletteOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded bg-card border border-subtle text-text-muted hover:text-text-primary hover:bg-subtle transition active:scale-[0.98]"
            title="Command Palette (⌘K)"
          >
            <CmdIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {!project.scenes.length && <div className="hidden md:flex px-4 py-2 border-b border-subtle text-sm gap-4 items-center"><span className="text-text-muted">Start with your brief, then add a scene to build the active cut.</span><button className="px-3 py-2 rounded bg-accent-primary text-app" onClick={async()=>{try{const response=await apiFetch(`/api/projects/${project.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:project.revision||0,scenes:[{id:`scene_${Date.now()}`,name:'Scene 1',order:1,targetDurationSec:5}]})});updateProject((await response.json()).project);}catch(error){toast.error((error as Error).message);}}}>Add first scene</button></div>}
      {/* Main Spatial Director Workspace */}
      <ProjectReview key={project.id} project={project}/>
      <main className="studio-main flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 relative">
          <SpatialDirectorCanvas
            project={project}
            agents={agents}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onBranchNode={handleBranchNode}
            onUpdateProject={updateProject}
            onSetActiveCut={handleSetActiveCut}
            onMediaDrop={handleMediaDrop}
            onOpenDaVinciExport={() => setIsDaVinciExportOpen(true)}
            onOpenSubjectManager={() => setIsSubjectManagerOpen(true)}
            onOpenTasteMixer={() => setIsTasteMixerOpen(true)}
            onOpenProjectSettings={() => setIsProjectSettingsOpen(true)}
          />
        </div>

        {/* Bottom Playback Scrubber Dock (Only rendered when concrete scenes exist) */}
        {project.scenes && project.scenes.length > 0 && (
          <BottomPlaybackDock
            safeAreas={safeAreas}
            onMediaDrop={handleMediaDrop}
            project={project}
            onUpdateProject={updateProject}
            onFocusScene={(sceneId) => {
              const cutNodeId = project.activeCut?.[sceneId];
              if (cutNodeId && project.nodes[cutNodeId]) {
                setSelectedNodeId(cutNodeId);
              } else {
                const sceneNode = Object.values(project.nodes).find(
                  (n) => n.sceneId === sceneId
                );
                if (sceneNode) {
                  setSelectedNodeId(sceneNode.id);
                }
              }
            }}
            onSetActiveCut={handleSetActiveCut}
            onOpenDaVinciExport={() => setIsDaVinciExportOpen(true)}
          />
        )}
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

      {/* Lazy Suspense Boundary for On-Demand Modals */}
      <Suspense fallback={null}>
        {/* Genesis Room Wizard (Cmd+N) */}
        {isNewProjectOpen && (
          <NewProjectWizard
            isOpen={isNewProjectOpen}
            onClose={() => setIsNewProjectOpen(false)}
            onProjectCreated={(newProj) => {
              handleSelectProject(newProj);
              setIsNewProjectOpen(false);
            }}
          />
        )}

        {/* Project Settings Modal (Aspect Ratio, Duration, FPS, Typography, Theme) */}
        {isProjectSettingsOpen && (
          <ProjectSettingsModal
            isOpen={isProjectSettingsOpen}
            onClose={() => setIsProjectSettingsOpen(false)}
            project={project}
            onUpdateProject={updateProject}
            currentTheme={theme}
            onThemeChange={setTheme}
          />
        )}

        {/* Cascading Taste Mixer Modal */}
        {isTasteMixerOpen && (
          <TasteMixerModal
            isOpen={isTasteMixerOpen}
            onClose={() => setIsTasteMixerOpen(false)}
            project={project}
            onUpdateProject={updateProject}
          />
        )}

        {/* Project Subject Anchors & Asset Manager Modal */}
        {isSubjectManagerOpen && (
          <SubjectManagerModal
            isOpen={isSubjectManagerOpen}
            onClose={() => setIsSubjectManagerOpen(false)}
            project={project}
            onUpdateProject={updateProject}
          />
        )}

        {/* DaVinci Multi-Track Export Modal */}
        {isDaVinciExportOpen && (
          <DaVinciExportModal
            isOpen={isDaVinciExportOpen}
            onClose={() => setIsDaVinciExportOpen(false)}
            projectId={project.id}
            projectFps={project.fps}
            revision={project.revision}
            projectName={project.name}
            totalDurationSec={totalDuration}
          />
        )}

        {/* Media Trimmer Modal */}
        {trimmerData && (
          <MediaTrimmerModal
            isOpen={trimmerData.isOpen}
            onClose={() => setTrimmerData(null)}
            file={trimmerData.file}
            targetDurationSec={trimmerData.targetDurationSec}
            onConfirmTrim={async (start, dur) => {
              const query = new URLSearchParams({filename:trimmerData.file.name,start:String(start),duration:String(dur)});
              const response = await apiFetch(`/api/projects/${project.id}/nodes/${trimmerData.nodeId}/media?${query}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:trimmerData.file});
              const result = await response.json(); updateProject(result.project);toast.success('Media imported and attached');
            }}
          />
        )}
      </Suspense>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        onOpenProjectSettings={() => setIsProjectSettingsOpen(true)}
        onOpenTasteMixer={() => setIsTasteMixerOpen(true)}
        onOpenDaVinciExport={() => setIsDaVinciExportOpen(true)}
        onBranchSelected={() => selectedNodeId && handleBranchNode(selectedNodeId)}
        onSelectModel={async (engine) => {
          if (!selectedNodeId) return toast.warning('Select a node first');
          try {
            const response=await apiFetch(`/api/projects/${project.id}/nodes/${selectedNodeId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({modelEngine:engine})});
            const data=await response.json();updateProject(data.project);toast.success('Selected node model saved');
          } catch(error) {toast.error((error as Error).message);}
        }}
        onToggleSafeAreas={() => setSafeAreas(prev=>!prev)}
      />

      {/* Active Project Delete / Remove Confirmation Modal */}
      {isDeleteModalOpen && (
        <div ref={deleteDialog} aria-label="Remove project" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
          <div className="relative w-full max-w-sm bg-surface border border-subtle rounded-lg shadow-2xl p-5 text-text-primary space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-text-primary">Delete Project</h3>
                <p className="text-[11px] text-text-muted truncate max-w-[240px]">{project.name}</p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Permanently delete project files from disk or only remove from the studio project list?
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleConfirmDeleteActiveProject(true)}
                disabled={isDeletingActiveProject}
                className="w-full p-2.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left transition flex items-center justify-between group disabled:opacity-50 active:scale-[0.99]"
              >
                <div>
                  <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to Trash</span>
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Deletes project directory and files from disk.
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleConfirmDeleteActiveProject(false)}
                disabled={isDeletingActiveProject}
                className="w-full p-2.5 rounded bg-card hover:bg-subtle border border-subtle text-left transition flex items-center justify-between group disabled:opacity-50 active:scale-[0.99]"
              >
                <div>
                  <div className="text-xs font-bold text-text-primary">
                    Remove from List
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Keeps files on disk, removes from studio recents.
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-subtle">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingActiveProject}
                className="px-3 py-1.5 rounded text-xs font-semibold text-text-muted hover:text-text-primary transition active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function RootApp() {
  return (
    <StudioErrorBoundary>
      <App />
    </StudioErrorBoundary>
  );
}
