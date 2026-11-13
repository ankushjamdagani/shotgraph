import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  Plus,
  Search,
  Clock,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Film,
  LayoutGrid,
  List,
  Monitor,
  Smartphone,
  Square,
  ArrowUpRight,
  HardDrive,
} from 'lucide-react';
import { ProjectRegistryEntry, FilmProject } from '../../types';
import { NewProjectWizard } from './NewProjectWizard';
import { StudioTheme } from '../ui-ux/ThemeCustomizer';
import { ThemeDropdownMenu } from '../ui-ux/ThemeDropdownMenu';

interface ProjectHubModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentProjectId?: string;
  onSelectProject: (project: FilmProject) => void;
  isStandalonePage?: boolean;
  currentTheme?: StudioTheme;
  onThemeChange?: (theme: StudioTheme) => void;
}

type ViewMode = 'grid' | 'list';
type AspectFilter = 'all' | '16:9' | '9:16' | '1:1';

// Stage color-coding for the DAG visualizer
const STAGE_COLORS: Record<string, string> = {
  ideation: '#38BDF8', // Sky
  script: '#34D399',   // Emerald
  taste: '#F59E0B',    // Amber
  assets: '#A855F7',   // Purple
  shot: '#818CF8',     // Indigo
  footage: '#F43F5E',  // Rose
  vfx: '#EC4899',      // Pink
  assembly: '#14B8A6', // Teal
};

// Stage abbreviated label
const STAGE_LABELS: Record<string, string> = {
  ideation: 'IDEA',
  script: 'SCR',
  taste: 'DNA',
  assets: 'ASSET',
  shot: 'SHOT',
  footage: 'TAKE',
  vfx: 'VFX',
  assembly: 'COMP',
};

// Column placement order for pipeline stages
const STAGE_COLUMN_INDEX: Record<string, number> = {
  ideation: 0,
  script: 1,
  taste: 2,
  assets: 2,
  shot: 3,
  footage: 4,
  vfx: 4,
  assembly: 5,
};

// Miniature DAG Preview component representing the workflow graph
const MiniDagPreview: React.FC<{ nodes?: ProjectRegistryEntry['dagNodes'] }> = ({ nodes }) => {
  const dagLayout = useMemo(() => {
    if (!nodes || nodes.length === 0) return null;

    // Group nodes into columns
    const columns: Record<number, typeof nodes> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    nodes.forEach((n) => {
      const colIdx = STAGE_COLUMN_INDEX[n.stage] ?? 1;
      columns[colIdx].push(n);
    });

    // Active column indices with at least one node
    const activeCols = Object.keys(columns)
      .map(Number)
      .filter((c) => columns[c].length > 0)
      .sort((a, b) => a - b);

    if (activeCols.length === 0) return null;

    const colXPositions: Record<number, number> = {};
    const totalCols = activeCols.length;
    activeCols.forEach((colIdx, i) => {
      // Space columns evenly across width 20 to 300
      colXPositions[colIdx] = 30 + (i / Math.max(1, totalCols - 1)) * 260;
    });

    // Map each node ID to (x, y) coordinates
    const nodeCoords: Record<string, { x: number; y: number; node: (typeof nodes)[0] }> = {};
    activeCols.forEach((colIdx) => {
      const colNodes = columns[colIdx];
      const x = colXPositions[colIdx];
      const count = colNodes.length;

      colNodes.forEach((node, rowIdx) => {
        let y = 80;
        if (count === 1) {
          y = 80;
        } else if (count === 2) {
          y = rowIdx === 0 ? 48 : 112;
        } else if (count === 3) {
          y = 36 + rowIdx * 44;
        } else {
          y = 28 + (rowIdx / (count - 1)) * 104;
        }
        nodeCoords[node.id] = { x, y, node };
      });
    });

    // Generate connector curves between parent and child nodes
    const edges: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; id: string }> = [];
    nodes.forEach((child) => {
      if (child.parentId && nodeCoords[child.parentId] && nodeCoords[child.id]) {
        edges.push({
          from: nodeCoords[child.parentId],
          to: nodeCoords[child.id],
          id: `${child.parentId}->${child.id}`,
        });
      }
    });

    return {
      nodeCoords: Object.values(nodeCoords),
      edges,
    };
  }, [nodes]);

  // If no nodes in DAG, render an elegant starter wireframe
  if (!dagLayout) {
    return (
      <svg className="w-full h-full" viewBox="0 0 320 160" fill="none">
        <defs>
          <pattern id="dag-empty-dots" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="0.75" fill="var(--dot-color)" opacity="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dag-empty-dots)" />

        {/* Start to target dotted connection line */}
        <path
          d="M 75 80 C 120 80, 160 80, 210 80"
          stroke="var(--border-subtle)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* Initial Root Capsule */}
        <g transform="translate(50, 69)">
          <rect width="44" height="22" rx="3" fill="var(--bg-card)" stroke="var(--border-subtle)" />
          <circle cx="9" cy="11" r="2.5" fill="#38BDF8" />
          <text x="17" y="14" fontSize="8" fontFamily="monospace" fill="var(--text-muted)" fontWeight="600">
            ROOT
          </text>
        </g>

        {/* Target Empty Socket */}
        <g transform="translate(210, 69)">
          <rect
            width="58"
            height="22"
            rx="3"
            fill="var(--bg-card)"
            stroke="var(--border-subtle)"
            strokeDasharray="2 2"
          />
          <text x="8" y="14" fontSize="8" fontFamily="monospace" fill="var(--text-muted)">
            + CANVAS
          </text>
        </g>

        <text
          x="160"
          y="126"
          textAnchor="middle"
          fontSize="9"
          fontFamily="monospace"
          fill="var(--text-muted)"
          opacity="0.5"
        >
          Blank DAG Workspace
        </text>
      </svg>
    );
  }

  // Render populated DAG
  return (
    <svg className="w-full h-full" viewBox="0 0 320 160" fill="none">
      <defs>
        <pattern id="dag-grid-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="8" r="0.75" fill="var(--dot-color)" opacity="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dag-grid-dots)" />

      {/* Directed Connector Bezier Edges */}
      {dagLayout.edges.map((e) => {
        const dx = Math.max(16, (e.to.x - e.from.x) * 0.45);
        const pathD = `M ${e.from.x + 20} ${e.from.y} C ${e.from.x + 20 + dx} ${e.from.y}, ${
          e.to.x - 20 - dx
        } ${e.to.y}, ${e.to.x - 20} ${e.to.y}`;
        return (
          <path
            key={e.id}
            d={pathD}
            stroke="var(--border-focus)"
            strokeWidth="1.25"
            strokeOpacity="0.45"
            className="group-hover/thumb:stroke-[var(--accent-primary)] group-hover/thumb:stroke-opacity-80 transition-all duration-300"
          />
        );
      })}

      {/* DAG Nodes */}
      {dagLayout.nodeCoords.map(({ x, y, node }) => {
        const stageColor = STAGE_COLORS[node.stage] || '#94A3B8';
        const label = STAGE_LABELS[node.stage] || node.stage.slice(0, 4).toUpperCase();
        return (
          <g key={node.id} transform={`translate(${x - 22}, ${y - 9})`}>
            {/* Node Capsule Background */}
            <rect
              width="44"
              height="18"
              rx="3"
              fill="var(--bg-card)"
              stroke="var(--border-subtle)"
              className="group-hover/thumb:stroke-[var(--border-focus)] transition-colors"
            />
            {/* Stage Indicator Dot */}
            <circle cx="7" cy="9" r="2" fill={stageColor} />
            {/* Stage Label */}
            <text
              x="13"
              y="12"
              fontSize="7.5"
              fontFamily="monospace"
              fontWeight="600"
              fill="var(--text-muted)"
              letterSpacing="0.02em"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const ProjectHubModal: React.FC<ProjectHubModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onSelectProject,
  isStandalonePage = false,
  currentTheme = 'studio-dark',
  onThemeChange,
}) => {
  const [projects, setProjects] = useState<ProjectRegistryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [aspectFilter, setAspectFilter] = useState<AspectFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpeningNativeFinder, setIsOpeningNativeFinder] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectRegistryEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3030/api/projects');
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      }
    } catch {
      setErrorMsg('Could not connect to project service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenProject = async (idOrPath: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`http://localhost:3030/api/projects/${encodeURIComponent(idOrPath)}`);
      const project = await res.json();
      if (!res.ok || !project.id) {
        throw new Error(project.error || 'Failed to load project');
      }
      onSelectProject(project);
      onClose?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to open project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFolderFromFinder = async () => {
    setIsOpeningNativeFinder(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:3030/api/projects/pick-directory', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.path) {
        const openRes = await fetch('http://localhost:3030/api/projects/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: data.path }),
        });
        const openData = await openRes.json();
        if (openData.project) {
          onSelectProject(openData.project);
          onClose?.();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not open folder');
    } finally {
      setIsOpeningNativeFinder(false);
    }
  };

  const handleInitiateDelete = (e: React.MouseEvent, project: ProjectRegistryEntry) => {
    e.stopPropagation();
    setProjectToDelete(project);
  };

  const handleConfirmDelete = async (moveToTrash: boolean) => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`http://localhost:3030/api/projects/${projectToDelete.id}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveToTrash }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove project');
      }
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q);
    const matchesAspect = aspectFilter === 'all' || p.aspectRatio === aspectFilter;
    return matchesSearch && matchesAspect;
  });

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    return `${diffDays}d ago`;
  };

  const formatCutDuration = (sec?: number) => {
    const total = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const containerClasses = isStandalonePage
    ? 'flex flex-col h-screen w-screen bg-app text-text-primary overflow-hidden'
    : 'relative w-full max-w-6xl bg-surface border border-subtle rounded-lg shadow-2xl overflow-hidden flex flex-col h-[88vh] text-text-primary';

  const modalWrapperClasses = isStandalonePage
    ? ''
    : 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150';

  // Render project card visual thumbnail (Project Video or DAG Preview)
  // Clean single edge-to-edge canvas with zero nested concentric borders or stamped settings
  const renderCardThumbnail = (p: ProjectRegistryEntry, isCurrent: boolean) => {
    const videoUrl = p.previewVideoUrl || p.previewThumbnailUrl;
    const isVideoFile =
      videoUrl &&
      (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm') || videoUrl.endsWith('.mov'));

    return (
      <div className="relative w-full h-40 bg-app border-b border-faint overflow-hidden flex items-center justify-center select-none group/thumb">
        {videoUrl ? (
          isVideoFile ? (
            <video
              src={videoUrl}
              muted
              loop
              autoPlay
              playsInline
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <img
              src={videoUrl}
              alt={p.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          )
        ) : (
          /* Render DAG Preview */
          <MiniDagPreview nodes={p.dagNodes} />
        )}

        {/* Active Project badge in top-right */}
        {isCurrent && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-surface/90 text-accent-primary border border-subtle shadow-xs z-20 backdrop-blur-xs">
            <CheckCircle2 className="w-2.5 h-2.5 text-accent-primary" />
            <span>ACTIVE</span>
          </div>
        )}

        {/* Delete action button in top-left */}
        <button
          title="Delete project"
          onClick={(e) => handleInitiateDelete(e, p)}
          className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 p-1.5 rounded bg-surface/90 text-text-muted hover:text-red-400 border border-subtle hover:border-red-500/40 transition-all z-20 shadow-xs backdrop-blur-xs"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const content = (
    <div className={containerClasses}>
      {/* Studio Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-subtle bg-surface shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-card text-accent-primary border border-subtle flex items-center justify-center">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-text-primary">Projects</h1>
          </div>
        </div>

        {/* Actions & Theme Dropdown Menu */}
        <div className="flex items-center gap-2">
          {onThemeChange && currentTheme && (
            <ThemeDropdownMenu currentTheme={currentTheme} onThemeChange={onThemeChange} />
          )}

          <button
            onClick={handleOpenFolderFromFinder}
            disabled={isOpeningNativeFinder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-subtle active:scale-[0.98] text-text-primary rounded text-xs font-semibold border border-subtle transition shadow-xs disabled:opacity-50"
            title="Open folder from Finder"
          >
            {isOpeningNativeFinder ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-accent-primary" />
            )}
            <span>Open Folder</span>
          </button>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary hover:opacity-90 active:scale-[0.98] text-app font-bold text-xs rounded shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>

          {!isStandalonePage && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 ml-1 rounded text-text-muted hover:text-text-primary hover:bg-card transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Subheader Toolbar: Search, Aspect Filter Chips, and View Modes */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-subtle bg-surface/60 shrink-0">
        {/* Left: Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="relative w-64 md:w-72">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 bg-card border border-subtle rounded text-xs font-sans text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent-primary transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 p-0.5 text-text-muted hover:text-text-primary rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Aspect Filter Chips */}
          <div className="hidden sm:flex items-center gap-1 bg-card p-0.5 rounded border border-subtle text-[11px] font-mono">
            {(['all', '16:9', '9:16'] as const).map((filter) => {
              const count =
                filter === 'all'
                  ? projects.length
                  : projects.filter((p) => p.aspectRatio === filter).length;
              const label = filter === 'all' ? 'All' : filter;
              const isActive = aspectFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setAspectFilter(filter)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    isActive
                      ? 'bg-surface text-accent-primary font-bold shadow-xs'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {label}
                  <span className="ml-1 opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Count & View Mode Toggle (Grid and List) */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted font-mono">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
          </span>

          {/* View Mode Toggle: Grid and List */}
          <div className="flex items-center bg-card p-0.5 rounded border border-subtle">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-surface text-accent-primary shadow-xs border border-subtle/50'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-surface text-accent-primary shadow-xs border border-subtle/50'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error notice */}
      {errorMsg && (
        <div className="mx-6 mt-3 p-2.5 bg-red-950/60 border border-red-800 rounded text-xs text-red-200 flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Project Display Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading && projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
            <span className="text-xs font-mono">Loading projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-subtle rounded-md bg-card/30">
            <div className="w-10 h-10 rounded bg-card flex items-center justify-center text-text-muted mb-3 border border-subtle">
              <Folder className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-text-primary mb-1">No projects found</h3>
            <p className="text-xs text-text-muted max-w-sm mb-4">
              {searchQuery || aspectFilter !== 'all'
                ? 'No projects match your filter.'
                : 'Create a project or open an existing directory.'}
            </p>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsWizardOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary hover:opacity-90 active:scale-[0.98] text-app font-bold text-xs rounded transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Project</span>
              </button>
              <button
                onClick={handleOpenFolderFromFinder}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-subtle active:scale-[0.98] text-text-primary font-semibold text-xs rounded border border-subtle transition"
              >
                <FolderOpen className="w-3.5 h-3.5 text-accent-primary" />
                <span>Open Folder</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* ========================================================
             GRID VIEW: Redesigned Minimalist Cards (Zero concentric borders)
             ======================================================== */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((p) => {
              const isCurrent = p.id === currentProjectId;

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenProject(p.id)}
                  className={`group relative rounded-md border text-left cursor-pointer transition-all duration-150 overflow-hidden flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-card border-accent-primary ring-1 ring-accent-primary/30 shadow-md'
                      : 'bg-card border-subtle hover:border-text-muted/50 hover:-translate-y-0.5 hover:shadow-lg'
                  }`}
                >
                  {/* Visual Thumbnail: Edge-to-edge Project Video or DAG Preview */}
                  {renderCardThumbnail(p, isCurrent)}

                  {/* Card Content & Metadata below Thumbnail */}
                  <div className="p-3 flex flex-col justify-between flex-1 space-y-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-text-primary group-hover:text-accent-primary transition truncate">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-text-muted truncate font-mono mt-1 flex items-center gap-1">
                        <HardDrive className="w-2.5 h-2.5 text-text-muted/60 shrink-0" />
                        <span className="truncate">{p.path}</span>
                      </p>
                    </div>

                    {/* Metadata Badges - Uniform badge styling, no separators */}
                    <div className="flex items-center justify-between gap-1.5 text-text-muted font-mono">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-surface border border-subtle text-text-muted">
                          {p.aspectRatio}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-surface border border-subtle text-text-muted">
                          {formatCutDuration(p.targetDurationSec)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-surface border border-subtle text-text-muted">
                          {p.fps || 30} FPS
                        </span>
                        {p.dagNodes && p.dagNodes.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-surface border border-subtle text-text-muted">
                            {p.dagNodes.length} nodes
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-[10px] text-text-muted/70">
                        <Clock className="w-2.5 h-2.5 text-text-muted/50" />
                        <span>{formatRelativeTime(p.lastOpenedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================
             LIST VIEW: Dense Commercial NLE Project Table
             ======================================================== */
          <div className="border border-faint rounded-md overflow-hidden bg-card/60 backdrop-blur-sm shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-faint bg-surface/80 text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider select-none">
                  <th className="py-2 px-3">Project</th>
                  <th className="py-2 px-2.5">Ratio</th>
                  <th className="py-2 px-2.5">Timebase</th>
                  <th className="py-2 px-2.5">Duration</th>
                  <th className="py-2 px-2.5">Nodes</th>
                  <th className="py-2 px-2.5">Location</th>
                  <th className="py-2 px-2.5">Opened</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-faint text-xs">
                {filteredProjects.map((p) => {
                  const isCurrent = p.id === currentProjectId;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenProject(p.id)}
                      className={`group cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-accent-primary/10 hover:bg-accent-primary/15'
                          : 'hover:bg-surface/70'
                      }`}
                    >
                      {/* Name & Active Indicator */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-surface border border-subtle text-accent-primary shrink-0">
                            {p.aspectRatio === '9:16' ? (
                              <Smartphone className="w-3 h-3" />
                            ) : p.aspectRatio === '16:9' ? (
                              <Monitor className="w-3 h-3" />
                            ) : (
                              <Square className="w-3 h-3" />
                            )}
                          </div>
                          <div className="truncate max-w-[220px]">
                            <div className="font-semibold text-text-primary group-hover:text-accent-primary transition truncate">
                              {p.name}
                            </div>
                            {isCurrent && (
                              <span className="text-[8px] font-mono font-bold text-accent-primary">
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Format */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-surface border border-subtle text-text-primary">
                          {p.aspectRatio}
                        </span>
                      </td>

                      {/* Timebase */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-[11px] text-text-muted">
                        {p.fps || 30} FPS
                      </td>

                      {/* Duration */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-[11px] text-accent-primary font-semibold">
                        {formatCutDuration(p.targetDurationSec)}
                      </td>

                      {/* Nodes Count */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-[10px] text-text-muted">
                        {p.dagNodes ? `${p.dagNodes.length} nodes` : '—'}
                      </td>

                      {/* Path */}
                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-1 font-mono text-[10px] text-text-muted truncate max-w-xs">
                          <Folder className="w-2.5 h-2.5 text-text-muted/60 shrink-0" />
                          <span className="truncate">{p.path}</span>
                        </div>
                      </td>

                      {/* Last Opened */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-[10px] text-text-muted">
                        {formatRelativeTime(p.lastOpenedAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Delete project"
                            onClick={(e) => handleInitiateDelete(e, p)}
                            className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-card border border-transparent transition opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-surface group-hover:bg-accent-primary group-hover:text-app text-accent-primary text-xs font-semibold border border-subtle group-hover:border-transparent transition shadow-xs">
                            <span>Open</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Bar: Engine status and shortcut */}
      <div className="px-6 py-2.5 border-t border-subtle bg-surface flex items-center justify-between text-xs text-text-muted shrink-0">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          <span>Ready</span>
        </div>
        <div className="text-[11px] text-text-muted font-mono">
          <span>
            Press <kbd className="px-1.5 py-0.5 bg-card rounded border border-subtle text-text-primary text-[10px]">⌘O</kbd> in studio
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isStandalonePage ? content : <div className={modalWrapperClasses}>{content}</div>}

      {/* New Project Wizard Modal */}
      <NewProjectWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onProjectCreated={(newProject) => {
          onSelectProject(newProject);
          onClose?.();
        }}
      />

      {/* Delete / Remove Project Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-surface border border-subtle rounded-lg shadow-2xl p-5 text-text-primary space-y-3.5">
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-text-primary">Delete Project</h3>
                <p className="text-[11px] text-text-muted truncate max-w-[240px]">
                  {projectToDelete.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Permanently delete project files from disk or only remove from the studio project list?
            </p>

            {/* Action Choices */}
            <div className="space-y-2 pt-1">
              {/* Option 1: Delete from System */}
              <button
                onClick={() => handleConfirmDelete(true)}
                disabled={isDeleting}
                className="w-full p-2.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left transition flex items-center justify-between group disabled:opacity-50"
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

              {/* Option 2: Remove from Studio Only */}
              <button
                onClick={() => handleConfirmDelete(false)}
                disabled={isDeleting}
                className="w-full p-2.5 rounded bg-card hover:bg-subtle border border-subtle text-left transition flex items-center justify-between group disabled:opacity-50"
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

            {/* Footer Cancel */}
            <div className="flex justify-end pt-2 border-t border-subtle">
              <button
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded text-xs font-semibold text-text-muted hover:text-text-primary transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
