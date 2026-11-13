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

interface ProjectHubModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentProjectId?: string;
  onSelectProject: (project: FilmProject) => void;
  isStandalonePage?: boolean;
}

export const ProjectHubModal: React.FC<ProjectHubModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onSelectProject,
  isStandalonePage = false,
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
    ? 'flex flex-col h-screen w-screen bg-[#0A0D14] text-[#F8FAFC] overflow-hidden'
    : 'relative w-full max-w-5xl bg-[#0B0F19] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]';

  const modalWrapperClasses = isStandalonePage
    ? ''
    : 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150';

  const content = (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0E131F] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide text-white">VISUAL AI STUDIO</span>
                <span className="text-slate-600">|</span>
                <span className="text-xs font-bold text-sky-400">PROJECTS</span>
              </div>
              <p className="text-[11px] text-slate-400">DaVinci-style project manager & workspace hub</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenFolderFromFinder}
            disabled={isOpeningNativeFinder}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            {isOpeningNativeFinder ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>Open Folder...</span>
          </button>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>

          {!isStandalonePage && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Subheader Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-[#0B0F19] shrink-0">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects by name or directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
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
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <span className="text-xs">Loading studio projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-2xl bg-[#0E1424]/40">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400 mb-3">
              <Folder className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">No Projects Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              {searchQuery
                ? `No projects matching "${searchQuery}"`
                : 'Create a new project using format presets or point to an existing folder on your Mac.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsWizardOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
              <button
                onClick={handleOpenFolderFromFinder}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition"
              >
                <FolderOpen className="w-4 h-4 text-sky-400" />
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
                      ? 'bg-[#11192E] border-sky-500/80 shadow-lg shadow-sky-950/50 ring-1 ring-sky-500/40'
                      : 'bg-[#0E1526] border-slate-800/80 hover:border-slate-700 hover:bg-[#11192E] hover:-translate-y-0.5'
                  }`}
                >
                  <div>
                    {/* Visual Aspect Ratio Viewport Simulation */}
                    <div className="w-full h-32 mb-3 rounded-xl bg-[#070A10] border border-slate-800/70 flex items-center justify-center relative overflow-hidden group-hover:border-slate-700 transition">
                      {p.aspectRatio === '9:16' ? (
                        <div className="w-[50px] h-[90px] rounded-lg border border-slate-700/80 bg-slate-900/90 relative flex flex-col items-center justify-between p-1 shadow-inner">
                          <div className="w-3 h-0.5 rounded-full bg-slate-700" />
                          <div className="w-full flex-1 my-1 border border-dashed border-sky-500/25 rounded flex items-center justify-center">
                            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                          </div>
                          <div className="w-3 h-0.5 rounded-full bg-slate-800" />
                        </div>
                      ) : p.aspectRatio === '16:9' ? (
                        <div className="w-[104px] h-[58px] rounded-lg border border-slate-700/80 bg-slate-900/90 relative flex items-center justify-center shadow-inner">
                          <div className="w-full h-full border border-dashed border-sky-500/25 rounded flex items-center justify-center">
                            <Monitor className="w-4 h-4 text-sky-400" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-[66px] h-[66px] rounded-lg border border-slate-700/80 bg-slate-900/90 relative flex items-center justify-center shadow-inner">
                          <div className="w-full h-full border border-dashed border-sky-500/25 rounded flex items-center justify-center">
                            <Square className="w-4 h-4 text-sky-400" />
                          </div>
                        </div>
                      )}

                      {/* Active Status Badge in Top Right */}
                      {isCurrent && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-950/90 text-sky-300 border border-sky-700/80 backdrop-blur-sm">
                          <CheckCircle2 className="w-3 h-3 text-sky-400" />
                          <span>Active</span>
                        </div>
                      )}

                      {/* Hover action button: Delete from recents */}
                      <button
                        title="Remove from recent list"
                        onClick={(e) => handleRemoveProject(e, p.id, p.name)}
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-black/60 text-slate-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Project Information */}
                    <div className="mb-2.5">
                      <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition truncate">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                        {p.path}
                      </p>
                    </div>

                    {/* Format Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono">
                        {p.aspectRatio === '9:16' ? '9:16 REEL' : p.aspectRatio === '16:9' ? '16:9 WIDE' : '1:1 SQUARE'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono">
                        {p.fps || 30} FPS
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono">
                        {p.targetDurationSec || 30}s
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatRelativeTime(p.lastOpenedAt)}</span>
                    </div>
                    <span className="text-sky-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5 text-xs">
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
      <div className="px-6 py-3 border-t border-slate-800 bg-[#0E131F] flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>Multi-tab concurrency enabled: open different projects in separate tabs</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Shortcut: press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">Cmd+O</kbd> in editor
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
