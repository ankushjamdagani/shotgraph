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
} from 'lucide-react';
import { ProjectRegistryEntry, FilmProject } from '../../types';
import { NewProjectWizard } from './NewProjectWizard';

interface ProjectHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId?: string;
  onSelectProject: (project: FilmProject) => void;
}

export const ProjectHubModal: React.FC<ProjectHubModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onSelectProject,
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
    } catch (err: any) {
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
      onClose();
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
          onClose();
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
    const confirmed = window.confirm(`Remove "${name}" from recent projects list? (Files will remain untouched on disk)`);
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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
        <div className="relative w-full max-w-5xl bg-[#0B0F19] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">Video Studio Project Hub</h2>
                <p className="text-xs text-slate-400">DaVinci-style project manager & workspace switcher</p>
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

              <button
                onClick={onClose}
                className="p-1.5 ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subheader Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-[#0D1322]">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((p) => {
                  const isCurrent = p.id === currentProjectId;
                  const AspectIcon =
                    p.aspectRatio === '16:9' ? Monitor : p.aspectRatio === '1:1' ? Square : Smartphone;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleOpenProject(p.id)}
                      className={`group relative p-4 rounded-2xl border text-left cursor-pointer transition flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#131D33] border-sky-500/80 shadow-lg shadow-sky-950/50 ring-1 ring-sky-500/50'
                          : 'bg-[#0E1526] border-slate-800/90 hover:border-slate-700 hover:bg-[#11192E]'
                      }`}
                    >
                      {/* Top Bar inside card */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                isCurrent
                                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 group-hover:text-white'
                              }`}
                            >
                              <AspectIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition truncate max-w-[170px]">
                                  {p.name}
                                </h4>
                                {isCurrent && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                                    <CheckCircle2 className="w-3 h-3 text-sky-400" />
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate max-w-[200px] font-mono">
                                {p.path}
                              </p>
                            </div>
                          </div>

                          {/* Quick Remove from Recents */}
                          <button
                            title="Remove from recent list"
                            onClick={(e) => handleRemoveProject(e, p.id, p.name)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Format Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60">
                            {p.aspectRatio || '9:16'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60">
                            {p.fps || 30} fps
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60">
                            {p.targetDurationSec || 30}s duration
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Opened {formatRelativeTime(p.lastOpenedAt)}</span>
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
          <div className="px-6 py-3 border-t border-slate-800 bg-[#0F172A]/70 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Multi-tab concurrency active: project state is scoped per tab</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Shortcut: press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">Cmd+O</kbd> anytime
            </div>
          </div>
        </div>
      </div>

      {/* New Project Wizard Modal */}
      <NewProjectWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onProjectCreated={(newProject) => {
          onSelectProject(newProject);
          onClose();
        }}
      />
    </>
  );
};
