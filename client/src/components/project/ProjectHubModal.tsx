import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  Plus,
  Search,
  Clock,
  Smartphone,
  Monitor,
  Square,
  Trash2,
  ExternalLink,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Video,
} from 'lucide-react';
import { ProjectRegistryEntry, FilmProject } from '../../types';
import { NewProjectWizard } from './NewProjectWizard';
import { ThemeCustomizer, StudioTheme } from '../ui-ux/ThemeCustomizer';

interface ProjectHubModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentProjectId?: string;
  onSelectProject: (project: FilmProject) => void;
  isStandalonePage?: boolean;
  currentTheme?: StudioTheme;
  onThemeChange?: (theme: StudioTheme) => void;
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [isOpeningNativeFinder, setIsOpeningNativeFinder] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
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
        // Open the chosen directory
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

  const handleRemoveProject = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Remove "${name}" from recent projects list? (Files will remain untouched on disk)`
    );
    if (!confirmed) return;

    try {
      await fetch(`http://localhost:3030/api/projects/${id}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveToTrash: false }),
      });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setErrorMsg('Failed to remove project from recent list');
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const containerClasses = isStandalonePage
    ? 'flex flex-col h-screen w-screen bg-app text-text-primary overflow-hidden'
    : 'relative w-full max-w-5xl bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] text-text-primary';

  const modalWrapperClasses = isStandalonePage
    ? ''
    : 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150';

  const content = (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-card text-accent-primary border border-subtle">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide text-text-primary">VISUAL AI STUDIO</span>
                <span className="text-text-muted">|</span>
                <span className="text-xs font-bold text-accent-primary">PROJECTS</span>
              </div>
              <p className="text-[11px] text-text-muted">DaVinci-style project manager & workspace hub</p>
            </div>
          </div>
        </div>

        {/* Actions & Theme Customizer */}
        <div className="flex items-center gap-2.5">
          {onThemeChange && (
            <ThemeCustomizer currentTheme={currentTheme} onThemeChange={onThemeChange} />
          )}

          <button
            onClick={handleOpenFolderFromFinder}
            disabled={isOpeningNativeFinder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-subtle/50 text-text-primary rounded-xl text-xs font-semibold border border-subtle transition"
          >
            {isOpeningNativeFinder ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-accent-primary" />
            )}
            <span>Open Folder...</span>
          </button>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-primary hover:opacity-90 text-app font-bold text-xs rounded-xl shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>

          {!isStandalonePage && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 ml-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Subheader Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-subtle bg-surface/50 shrink-0">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects by name or directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-card border border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-primary transition"
          />
        </div>
        <div className="text-xs text-text-muted font-mono">
          {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} found
        </div>
      </div>

      {/* Error notice */}
      {errorMsg && (
        <div className="mx-6 mt-3 p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Project Cards Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading && projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
            <span className="text-xs">Loading studio projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-subtle rounded-2xl bg-card/40">
            <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center text-text-muted mb-3 border border-subtle">
              <Folder className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-text-primary mb-1">No Projects Found</h3>
            <p className="text-xs text-text-muted max-w-sm mb-4">
              {searchQuery
                ? `No projects matching "${searchQuery}"`
                : 'Create a new project using format presets or point to an existing folder on your Mac.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsWizardOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent-primary hover:opacity-90 text-app font-bold text-xs rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
              <button
                onClick={handleOpenFolderFromFinder}
                className="flex items-center gap-1.5 px-4 py-2 bg-card hover:bg-subtle/50 text-text-primary font-semibold text-xs rounded-xl border border-subtle transition"
              >
                <FolderOpen className="w-4 h-4 text-accent-primary" />
                <span>Open Existing Folder</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((p) => {
              const isCurrent = p.id === currentProjectId;

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenProject(p.id)}
                  className={`group relative p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-card border-accent-primary shadow-lg ring-1 ring-accent-primary/40'
                      : 'bg-card border-subtle hover:border-text-muted/40 hover:bg-surface hover:-translate-y-0.5'
                  }`}
                >
                  <div>
                    {/* Visual Aspect Ratio Viewport Simulation */}
                    <div className="w-full h-32 mb-3 rounded-xl bg-app border border-subtle flex items-center justify-center relative overflow-hidden group-hover:border-subtle/80 transition">
                      {p.aspectRatio === '9:16' ? (
                        <div className="w-[50px] h-[90px] rounded-lg border border-subtle bg-surface relative flex flex-col items-center justify-between p-1 shadow-inner">
                          <div className="w-3 h-0.5 rounded-full bg-subtle" />
                          <div className="w-full flex-1 my-1 border border-dashed border-subtle rounded flex items-center justify-center">
                            <Smartphone className="w-3.5 h-3.5 text-accent-primary" />
                          </div>
                          <div className="w-3 h-0.5 rounded-full bg-subtle" />
                        </div>
                      ) : p.aspectRatio === '16:9' ? (
                        <div className="w-[104px] h-[58px] rounded-lg border border-subtle bg-surface relative flex items-center justify-center shadow-inner">
                          <div className="w-full h-full border border-dashed border-subtle rounded flex items-center justify-center">
                            <Monitor className="w-4 h-4 text-accent-primary" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-[66px] h-[66px] rounded-lg border border-subtle bg-surface relative flex items-center justify-center shadow-inner">
                          <div className="w-full h-full border border-dashed border-subtle rounded flex items-center justify-center">
                            <Square className="w-4 h-4 text-accent-primary" />
                          </div>
                        </div>
                      )}

                      {/* Active Status Badge in Top Right */}
                      {isCurrent && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-app/90 text-accent-primary border border-accent-primary/80 backdrop-blur-sm">
                          <CheckCircle2 className="w-3 h-3 text-accent-primary" />
                          <span>Active</span>
                        </div>
                      )}

                      {/* Hover action button: Delete from recents */}
                      <button
                        title="Remove from recent list"
                        onClick={(e) => handleRemoveProject(e, p.id, p.name)}
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-app/80 text-text-muted hover:text-red-400 border border-subtle transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Project Information */}
                    <div className="mb-2.5">
                      <h4 className="text-sm font-bold text-text-primary group-hover:text-accent-primary transition truncate">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-text-muted truncate font-mono mt-0.5">
                        {p.path}
                      </p>
                    </div>

                    {/* Format Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface text-text-primary border border-subtle font-mono">
                        {p.aspectRatio === '9:16' ? '9:16 REEL' : p.aspectRatio === '16:9' ? '16:9 WIDE' : '1:1 SQUARE'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface text-text-primary border border-subtle font-mono">
                        {p.fps || 30} FPS
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface text-text-primary border border-subtle font-mono">
                        {p.targetDurationSec || 30}s
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2.5 border-t border-subtle flex items-center justify-between text-[11px] text-text-muted">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span>{formatRelativeTime(p.lastOpenedAt)}</span>
                    </div>
                    <span className="text-accent-primary font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5 text-xs">
                      Open <ExternalLink className="w-3 h-3 inline" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="px-6 py-3 border-t border-subtle bg-surface flex items-center justify-between text-xs text-text-muted shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>Multi-tab concurrency enabled: open different projects in separate tabs</span>
        </div>
        <div className="text-[11px] text-text-muted">
          Shortcut: press <kbd className="px-1.5 py-0.5 bg-card rounded border border-subtle text-text-primary font-mono">Cmd+O</kbd> in editor
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
    </>
  );
};
