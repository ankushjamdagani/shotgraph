import { CollectionSort, type CollectionSortValue } from '../ui/collection-sort';
import { ProjectNameCue } from '../ui/collection';
import { ProjectStartPanel } from '../ui/project-start-panel';
import { getCollectionLayout, getCollectionListStyle, getCardHoverStyle } from '../ui/collection-appearance';
import { getPageBackground, getDefaultStartAppearance, type ProjectBackgroundStyles } from '../ui/page-background';
import { useDialog } from '../common/useDialog';
import {
  Button,
  IconButton,
  Input,
  Badge,
  NewItemIndicator,
  Tooltip,
  Thumbnail,
  Table,
  TableCell,
  TableRow,
  InlineRename,
  SegmentedControl,
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  cn,
} from '../ui';
import { toast } from '../../services/toastService';
import { apiFetch } from '../../services/api';
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
} from 'react';
import {
  Copy,
  Pencil,
  Plus,
  Search,
  ArrowRight,
  Trash2,
  CheckCircle2,
  X,
  Loader2,
  LayoutGrid,
  List,
  ArrowUpRight,
} from 'lucide-react';
import { ProjectRegistryEntry, FilmProject } from '../../types';
import { StudioTheme } from '../ui-ux/ThemeCustomizer';
import { ThemeToggle } from '../ui-ux/ThemeToggle';

const ProjectDesignTools = import.meta.env.DEV
  ? React.lazy(() => import('../../dev/ProjectDesignTools'))
  : null;

const NewProjectWizard = React.lazy(() =>
  import('./NewProjectWizard').then((m) => ({ default: m.NewProjectWizard })),
);

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

// Stage color-coding for the DAG visualizer
const STAGE_COLORS: Record<string, string> = {
  ideation: '#38BDF8', // Sky
  script: '#34D399', // Emerald
  taste: '#F59E0B', // Amber
  assets: '#A855F7', // Purple
  shot: '#818CF8', // Indigo
  footage: '#F43F5E', // Rose
  vfx: '#EC4899', // Pink
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
const MiniDagPreview: React.FC<{
  nodes?: ProjectRegistryEntry['dagNodes'];
}> = ({ nodes }) => {
  const dagLayout = useMemo(() => {
    if (!nodes || nodes.length === 0) return null;

    // Group nodes into columns
    const columns: Record<number, typeof nodes> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };
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
    const nodeCoords: Record<
      string,
      { x: number; y: number; node: (typeof nodes)[0] }
    > = {};
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
    const edges: Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      id: string;
    }> = [];
    nodes.forEach((child) => {
      if (
        child.parentId &&
        nodeCoords[child.parentId] &&
        nodeCoords[child.id]
      ) {
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
          <pattern
            id="dag-empty-dots"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="8"
              cy="8"
              r="0.75"
              fill="var(--dot-color)"
              opacity="0.7"
            />
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
          <rect
            width="44"
            height="22"
            rx="3"
            fill="var(--bg-card)"
            stroke="var(--border-subtle)"
          />
          <circle cx="9" cy="11" r="2.5" fill="#38BDF8" />
          <text
            x="17"
            y="14"
            fontSize="8"
            fontFamily="monospace"
            fill="var(--text-muted)"
            fontWeight="600"
          >
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
          <text
            x="8"
            y="14"
            fontSize="8"
            fontFamily="monospace"
            fill="var(--text-muted)"
          >
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
        <pattern
          id="dag-grid-dots"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="8"
            cy="8"
            r="0.75"
            fill="var(--dot-color)"
            opacity="0.6"
          />
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
          />
        );
      })}

      {/* DAG Nodes */}
      {dagLayout.nodeCoords.map(({ x, y, node }) => {
        const stageColor = STAGE_COLORS[node.stage] || '#94A3B8';
        const label =
          STAGE_LABELS[node.stage] || node.stage.slice(0, 4).toUpperCase();
        return (
          <g key={node.id} transform={`translate(${x - 22}, ${y - 9})`}>
            {/* Node Capsule Background */}
            <rect
              width="44"
              height="18"
              rx="3"
              fill="var(--bg-card)"
              stroke="var(--border-subtle)"
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
  currentTheme = 'film-lab-mono',
  onThemeChange,
}) => {
  const [backgroundStyles, setBackgroundStyles] =
    useState<ProjectBackgroundStyles>({ page: getPageBackground(), start: getDefaultStartAppearance(), panel: { borderBottomColor: 'transparent' } });
  const look = getCollectionLayout();
  const splitWorkspace = true;
  const [projects, setProjects] = useState<ProjectRegistryEntry[]>([]);
  const [sortOrder, setSortOrder] = useState<CollectionSortValue>({by:'opened',direction:'desc'});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpeningNativeFinder, setIsOpeningNativeFinder] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectRegistryEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [projectToRename, setProjectToRename] =
    useState<ProjectRegistryEntry | null>(null);
  const [newName, setNewName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const copiedCard = useRef<HTMLElement | null>(null);
  const trashTrigger = useRef<HTMLButtonElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const previousLayout = useRef<{
    view: ViewMode;
    rects: Map<string, DOMRect>;
  }>({ view: viewMode, rects: new Map() });
  useLayoutEffect(() => {
    const elements = [
      ...(resultsRef.current?.querySelectorAll<HTMLElement>(
        '[data-project-id]',
      ) || []),
    ];
    const next = new Map(
      elements.map((el) => [el.dataset.projectId!, el.getBoundingClientRect()]),
    );
    const previous = previousLayout.current;
    previousLayout.current = { view: viewMode, rects: next };
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      previous.view !== viewMode
    )
      return;
    for (const el of elements) {
      const before = previous.rects.get(el.dataset.projectId!);
      const after = next.get(el.dataset.projectId!)!;
      if (!before) continue;
      const x = viewMode === 'list' ? 0 : before.left - after.left;
      const y = before.top - after.top;
      if (Math.abs(x) < 1 && Math.abs(y) < 1) continue;
      el.getAnimations().forEach((animation) => animation.cancel());
      el.animate(
        [
          { transform: `translate(${x}px, ${y}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: 240, easing: 'cubic-bezier(.16,1,.3,1)' },
      );
    }
  }, [projects, searchQuery, sortOrder, viewMode, isOpen]);
  useEffect(() => {
    if (!copiedProjectId) return;
    copiedCard.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    const timer = window.setTimeout(() => setCopiedProjectId(null), 6000);
    return () => window.clearTimeout(timer);
  }, [copiedProjectId]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/projects');
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

  const hubDialog = useDialog(isOpen && !isStandalonePage, () => onClose?.());
  useEffect(() => {
    const open = () => setIsWizardOpen(true);
    window.addEventListener('studio:new-project', open);
    return () => window.removeEventListener('studio:new-project', open);
  }, []);
  if (!isOpen) return null;

  const handleCopyProject = async (p: ProjectRegistryEntry) => {
    setBusyAction(p.id);
    setErrorMsg('');
    try {
      const { project: copy }: { project: FilmProject } = await (
        await apiFetch(`/api/projects/${encodeURIComponent(p.id)}/duplicate`, {
          method: 'POST',
        })
      ).json();
      const entries: ProjectRegistryEntry[] = await (
        await apiFetch('/api/projects')
      ).json();
      const copiedEntry = entries.find((entry) => entry.id === copy.id);
      if (!copiedEntry)
        throw new Error(
          'Copy was created. Refresh the project list to see it.',
        );
      const ordered = entries.filter((entry) => entry.id !== copy.id);
      const sourceIndex = ordered.findIndex((entry) => entry.id === p.id);
      ordered.splice(sourceIndex + 1, 0, copiedEntry);
      setSearchQuery('');
      setProjects(ordered);
      toast.success(copy.name, 'Project copied', 6500, {
        label: 'Show',
        onClick: () => {
          const card = document.getElementById(`project-card-${copy.id}`);
          card?.scrollIntoView({ block: 'center' });
          card?.querySelector<HTMLButtonElement>('button')?.focus();
        },
      });
      setCopiedProjectId(copy.id);
    } catch (error) {
      setErrorMsg((error as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRenameProject = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!projectToRename || !newName.trim()) {
      setRenameError('Enter a project name.');
      return;
    }
    setBusyAction(projectToRename.id);
    setRenameError('');
    try {
      const id = encodeURIComponent(projectToRename.id);
      const project: FilmProject = await (
        await apiFetch(`/api/projects/${id}`)
      ).json();
      await apiFetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          revision: project.revision || 0,
        }),
      });
      setProjects((previous) =>
        previous.map((entry) =>
          entry.id === projectToRename.id
            ? { ...entry, name: newName.trim() }
            : entry,
        ),
      );
      setProjectToRename(null);
      toast.success(newName.trim(), 'Project renamed', 6500);
    } catch (error) {
      setRenameError((error as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenProject = async (idOrPath: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(
        `/api/projects/${encodeURIComponent(idOrPath)}`,
      );
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
      const res = await apiFetch('/api/projects/pick-directory', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.path) {
        const openRes = await apiFetch('/api/projects/open', {
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

  const handleInitiateDelete = (
    e: React.MouseEvent<HTMLButtonElement>,
    project: ProjectRegistryEntry,
  ) => {
    e.stopPropagation();
    trashTrigger.current = e.currentTarget;
    setErrorMsg('');
    setProjectToDelete(project);
  };

  const handleConfirmDelete = async (
    moveToTrash: boolean,
    target = projectToDelete,
  ) => {
    if (!target) return;
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const res = await apiFetch(`/api/projects/${target.id}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveToTrash }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove project');
      }
      const removed = target;
      setProjectToDelete(null);
      const card = document.getElementById(`project-card-${removed.id}`);
      if (
        card &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        await card
          .animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 200,
            easing: 'ease-in',
            fill: 'forwards',
          })
          .finished.catch(() => {});
      }
      setProjects((prev) => prev.filter((p) => p.id !== removed.id));
      toast.success(
        removed.name,
        moveToTrash ? 'Moved to Trash' : 'Project removed',
        6500,
        moveToTrash
          ? undefined
          : {
              label: 'Undo',
              onClick: async () => {
                await apiFetch('/api/projects/open', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ path: removed.path }),
                });
                const entries: ProjectRegistryEntry[] = await (
                  await apiFetch('/api/projects')
                ).json();
                setProjects(entries);
                toast.success(removed.name, 'Project restored');
              },
            },
      );
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
    return matchesSearch;
  }).sort((a, b) => {
    const comparison = sortOrder.by === 'name'
      ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      : sortOrder.by === 'created' ? (a.createdAt || 0) - (b.createdAt || 0)
      : (a.lastOpenedAt || 0) - (b.lastOpenedAt || 0);
    return sortOrder.direction === 'asc' ? comparison : -comparison;
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

  const openRename = (p: ProjectRegistryEntry) => {
    setProjectToRename(p);
    setNewName(p.name);
    setRenameError('');
  };
  const actionsDisabled = !!busyAction || isDeleting;
  const thumb = (p: ProjectRegistryEntry, compact = false) => {
    const url = p.previewVideoUrl || p.previewThumbnailUrl;
    const video = !!url && /\.(mp4|webm|mov)(\?|$)/i.test(url);
    return (
      <Thumbnail
        compact={compact}
        data-list-thumb={compact || undefined}
        className={compact ? look.compact : look.thumbnail}
      >
        {url ? (
          video ? (
            <video
              src={url}
              muted
              loop
              autoPlay
              playsInline
              className="size-full object-cover"
            />
          ) : (
            <img src={url} alt={p.name} className="size-full object-cover" />
          )
        ) : (
          <MiniDagPreview nodes={p.dagNodes} />
        )}
        {p.id === copiedProjectId && (
          <NewItemIndicator side={compact ? 'left' : 'right'} small={compact} />
        )}
        {!compact && p.id === currentProjectId && (
          <Badge className="absolute bottom-2.5 left-2.5">
            <CheckCircle2 className="size-3" />
            Active
          </Badge>
        )}
      </Thumbnail>
    );
  };
  const name = (p: ProjectRegistryEntry) => (
    <div className="relative flex h-6 min-w-0 items-center">
      {projectToRename?.id === p.id ? (
        <InlineRename
          value={newName}
          onChange={(value) => {
            setNewName(value);
            setRenameError('');
          }}
          onSave={() => {
            void handleRenameProject();
          }}
          onCancel={() => {
            setProjectToRename(null);
            setRenameError('');
          }}
          busy={!!busyAction}
          error={renameError}
        />
      ) : (
        <Button
          variant="ghost"
          data-project-name
          className="h-6 min-w-0 max-w-full justify-start px-0 text-sm font-semibold hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            void handleOpenProject(p.id);
          }}
        >
          <span className="truncate" title={p.name}>
            {p.name}
          </span>
          <ProjectNameCue/>
        </Button>
      )}
    </div>
  );
  const actions = (p: ProjectRegistryEntry, list = false) => (
    <div
      role="group"
      aria-label={`Actions for ${p.name}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'flex items-center gap-1 transition-opacity duration-fast motion-reduce:transition-none opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto',
        list
          ? 'justify-end'
          : 'absolute right-3 top-3 rounded-lg bg-surface p-1 shadow-dialog',
        !list && p.id === copiedProjectId && 'right-8',
      )}
    >
      <Tooltip label="Copy project">
        <IconButton
          label={`Copy ${p.name}`}
          size="icon-sm"
          loading={busyAction === p.id}
          disabled={actionsDisabled}
          onClick={() => {
            void handleCopyProject(p);
          }}
        >
          <Copy />
        </IconButton>
      </Tooltip>
      <Tooltip label="Rename project">
        <IconButton
          label={`Rename ${p.name}`}
          size="icon-sm"
          disabled={actionsDisabled}
          onClick={() => openRename(p)}
        >
          <Pencil />
        </IconButton>
      </Tooltip>
      <Tooltip label="Move to Trash">
        <IconButton
          label={`Delete ${p.name}`}
          size="icon-sm"
          className="text-danger"
          disabled={actionsDisabled}
          onClick={(e) => handleInitiateDelete(e, p)}
        >
          <Trash2 />
        </IconButton>
      </Tooltip>
      {list && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Open ${p.name}`}
          onClick={() => {
            void handleOpenProject(p.id);
          }}
        >
          Open
          <ArrowUpRight />
        </Button>
      )}
    </div>
  );
  const content = (
    <div
      ref={hubDialog}
      aria-label="Projects"
      style={backgroundStyles?.page}
      className={cn(
        'flex flex-col overflow-hidden bg-app text-text-primary',
        look.root,
        isStandalonePage
          ? 'h-screen w-screen'
          : 'relative h-[88vh] w-full max-w-6xl rounded-dialog border border-subtle shadow-dialog',
      )}
    >
      {splitWorkspace && <ProjectStartPanel
        onCreate={() => setIsWizardOpen(true)}
        onOpenFolder={handleOpenFolderFromFinder}
        opening={isOpeningNativeFinder}
        style={backgroundStyles.start}
        theme={onThemeChange && <ThemeToggle currentTheme={currentTheme} onThemeChange={onThemeChange}/>}
      />}
      <main className={cn("relative isolate flex min-h-0 min-w-0 flex-1 flex-col", look.main)}>
      <div
        className={cn('shrink-0 border-b border-subtle', look.panel)}
        style={backgroundStyles?.panel}
      >
        <header
          className={cn(
            'flex shrink-0 flex-wrap items-center justify-between gap-4 px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-9',
            look.header,
            splitWorkspace && isStandalonePage && 'lg:contents',
          )}
        >
          <h1
            className={cn(
              'text-3xl font-semibold tracking-tight sm:text-4xl',
              look.title,
              splitWorkspace && 'sr-only',
            )}
          >
            Projects
          </h1>
          <div className={cn('flex items-center gap-2', look.actions, splitWorkspace && 'lg:hidden')}>
            {onThemeChange && (
              <ThemeToggle
                currentTheme={currentTheme}
                onThemeChange={onThemeChange}
              />
            )}
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus />
              New Project
            </Button>
            <Button
              variant="ghost"
              loading={isOpeningNativeFinder}
              onClick={handleOpenFolderFromFinder}
            >
              {isOpeningNativeFinder ? 'Opening…' : 'Open Folder'}
              <ArrowUpRight />
            </Button>
            {!isStandalonePage && onClose && (
              <IconButton label="Close projects" onClick={onClose}>
                <X />
              </IconButton>
            )}
          </div>
          {splitWorkspace && !isStandalonePage && onClose && (
            <IconButton label="Close projects" className="hidden lg:inline-flex" onClick={onClose}><X/></IconButton>
          )}
        </header>
        <div
          className={cn(
            'flex shrink-0 flex-nowrap items-center justify-between gap-3 px-5 pb-5 sm:px-8',
            look.toolbar,
            splitWorkspace && isStandalonePage && 'lg:pt-6',
          )}
        >
          <div className={cn("flex min-w-0 flex-1 items-center", look.filters)}>
            <div className={cn("relative w-full max-w-[340px]", look.search)}>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <Input
                type="search"
                borderTone="subtle"
                aria-label="Search projects"
                placeholder="Search projects…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("pl-9 pr-9", splitWorkspace ? "h-control" : "h-control-lg")}
              />
              {searchQuery && (
                <IconButton
                  label="Clear search"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X />
                </IconButton>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <CollectionSort value={sortOrder} onChange={setSortOrder}/>
            <SegmentedControl
              label="Project view"
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
              options={[
                { value: 'grid', label: 'Grid view', content: <LayoutGrid /> },
                { value: 'list', label: 'List view', content: <List /> },
              ]}
              className="rounded-md border border-subtle p-0.5 [&_button]:size-7 [&_button]:px-0 [&_[data-state=on]]:bg-surface"
            />
          </div>
        </div>
      </div>
      {ProjectDesignTools && (
        <React.Suspense fallback={null}>
          <ProjectDesignTools onChange={setBackgroundStyles} />
        </React.Suspense>
      )}
      <div
        ref={resultsRef}
        className={cn(
          'flex-1 overflow-y-auto p-5 [scrollbar-gutter:stable] sm:p-8 sm:pt-6',
          look.results,
        )}
      >
        {errorMsg && !projectToDelete && (
          <p
            role="alert"
            className="mb-5 rounded-md border border-danger bg-surface p-3 text-sm text-danger"
          >
            {errorMsg}
          </p>
        )}
        {isLoading && !projects.length ? (
          <div
            role="status"
            className="flex h-40 items-center justify-center gap-2 text-sm text-text-muted"
          >
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            Loading projects…
          </div>
        ) : !filteredProjects.length ? (
          <div
            role="status"
            className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <Search className="mb-2 size-7 text-text-muted" aria-hidden />
            <h2 className="text-lg font-semibold">No matches found</h2>
            <p className="max-w-sm text-sm text-text-muted">
              {projects.length
                ? 'Try a different search or choose another format.'
                : 'Your projects will appear here once you create or open one.'}
            </p>
            {searchQuery && (
              <Button
                variant="secondary"
                borderTone="subtle"
                className="mt-2"
                onClick={() => {
                  setSearchQuery('');
                            }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div key="grid" className="animate-enter motion-reduce:animate-none">
            <div className={cn('grid', look.grid)}>
              <article className={cn('group min-w-0', look.card, getCardHoverStyle())}>
                <button
                  className="block w-full rounded-thumbnail text-left"
                  onClick={() => setIsWizardOpen(true)}
                >
                  <Thumbnail intent="create" className={look.thumbnail}>
                    <Plus className="size-7 stroke-[1.5] text-text-muted" />
                  </Thumbnail>
                  <span
                    data-project-name
                    className={cn(
                      'mt-4 flex h-6 items-center gap-2 text-sm font-semibold',
                    )}
                  >
                    New Project <ProjectNameCue/>
                  </span>
                  <span data-card-meta className="mt-2 block text-xs text-text-muted">
                    Start with a brief
                  </span>
                </button>
              </article>
              {filteredProjects.map((p) => (
                <article
                  key={p.id}
                  data-project-id={p.id}
                  id={`project-card-${p.id}`}
                  ref={p.id === copiedProjectId ? copiedCard : undefined}
                  aria-busy={busyAction === p.id}
                  onClick={(event) => {
                    if (!(event.target as HTMLElement).closest('button, input, [role="group"]')) void handleOpenProject(p.id);
                  }}
                  className={cn(
                    'group relative min-w-0 cursor-pointer',
                    look.card,
                    getCardHoverStyle(),
                    p.id === copiedProjectId &&
                      'animate-copy-arrive motion-reduce:animate-none',
                  )}
                >
                  <button
                    aria-label={`Open ${p.name}`}
                    onClick={() => {
                      void handleOpenProject(p.id);
                    }}
                    className="block w-full rounded-thumbnail text-left"
                  >
                    {thumb(p)}
                  </button>
                  <div className={look.details}>
                    {name(p)}
                    <div
                      data-card-meta
                      className={cn(
                        'mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-text-muted',
                        look.metadata,
                      )}
                    >
                      <span>{p.aspectRatio}</span>
                      <span>{formatCutDuration(p.targetDurationSec)}</span>
                      <span>{p.fps || 30} FPS</span>
                      {!!p.dagNodes?.length && (
                        <span>{p.dagNodes.length} nodes</span>
                      )}
                      <span className="ml-auto">
                        {formatRelativeTime(p.lastOpenedAt)}
                      </span>
                    </div>
                  </div>
                  {actions(p)}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div
            key="list"
            className={cn(
              'animate-enter overflow-x-clip motion-reduce:animate-none',
              look.list,
              getCollectionListStyle(),
            )}
          >
            <Table className="table-fixed">
              <tbody>
                <TableRow onClick={(event) => { if (!(event.target as HTMLElement).closest("button")) setIsWizardOpen(true); }} className="cursor-pointer">
                  <TableCell colSpan={2} className="p-0">
                    <button
                      data-list-content
                      className="flex w-full items-center gap-2 text-left"
                      onClick={() => setIsWizardOpen(true)}
                    >
                      <Thumbnail compact intent="create" data-list-thumb className={look.compact}>
                        <Plus className="size-4 text-text-muted" />
                      </Thumbnail>
                      <span data-list-text className="min-w-0"><span data-project-name className="flex items-center gap-2 text-sm font-semibold">New Project<ProjectNameCue/></span><span data-list-meta className="mt-1 block text-xs text-text-muted">Start with a brief</span></span><span className="ml-auto flex items-center gap-2 text-xs text-text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">Create<ArrowRight className="size-3.5"/></span>
                    </button>
                  </TableCell>
                </TableRow>
                {filteredProjects.map((p) => (
                  <TableRow
                    key={p.id}
                    data-project-id={p.id}
                    id={`project-card-${p.id}`}
                    onClick={() => {
                      void handleOpenProject(p.id);
                    }}
                    className={cn(
                      'cursor-pointer',
                      p.id === copiedProjectId &&
                        'animate-row-arrive motion-reduce:animate-none',
                    )}
                  >
                    <TableCell>
                      <div data-list-content className="flex items-center gap-2">
                        {thumb(p, true)}
                        <div
                          data-list-text
                          className="min-w-0 flex-1"
                          title={`${p.path}${p.dagNodes ? ` · ${p.dagNodes.length} nodes` : ''}`}
                        >
                          {name(p)}
                          <div data-list-meta className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                            <span className="tabular-nums">{p.aspectRatio} · {formatCutDuration(p.targetDurationSec)} · {p.fps || 30} fps</span>
                            <span>{formatRelativeTime(p.lastOpenedAt)}</span>
                            {p.id === currentProjectId && <Badge>Active</Badge>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-44">{actions(p, true)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
      </main>
    </div>
  );
  return (
    <>
      {isStandalonePage ? (
        content
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          {content}
        </div>
      )}
      {isWizardOpen && (
        <React.Suspense fallback={null}>
          <NewProjectWizard
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onProjectCreated={(project) => {
              onSelectProject(project);
              onClose?.();
            }}
          />
        </React.Suspense>
      )}
      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setProjectToDelete(null);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trashTrigger.current?.isConnected) trashTrigger.current.focus();
          }}
        >
          <div className="p-7">
            <div className="mb-5 flex size-11 items-center justify-center rounded-thumbnail bg-danger/10 text-danger">
              <Trash2 className="size-5" />
            </div>
            <AlertDialogTitle>
              Move “{projectToDelete?.name}” to Trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The project folder, footage, and assets will move to Finder Trash.
              You can restore them until Trash is emptied.
            </AlertDialogDescription>
            {errorMsg && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {errorMsg}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete(true);
              }}
            >
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {isDeleting ? 'Moving to Trash…' : 'Move to Trash'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
