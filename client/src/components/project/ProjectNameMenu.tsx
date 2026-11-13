import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  ChevronDown,
  Edit2,
  Copy,
  Film,
  Settings,
  FolderOpen,
  Trash2,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { FilmProject, ProjectRegistryEntry } from '../../types.js';
import { toast } from '../../services/toastService.js';

interface ProjectNameMenuProps {
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  onSelectProject: (newProject: FilmProject) => void;
  onOpenProjectSettings: () => void;
  onOpenDaVinciExport: () => void;
  onOpenProjectsHub: () => void;
  onDeleteProject: () => void;
}

export const ProjectNameMenu: React.FC<ProjectNameMenuProps> = ({
  project,
  onUpdateProject,
  onSelectProject,
  onOpenProjectSettings,
  onOpenDaVinciExport,
  onOpenProjectsHub,
  onDeleteProject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(project.name);
  const [recentProjects, setRecentProjects] = useState<ProjectRegistryEntry[]>([]);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  // Load recent projects when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:3030/api/projects')
        .then((res) => res.json())
        .then((list: ProjectRegistryEntry[]) => {
          if (Array.isArray(list)) {
            setRecentProjects(list.filter((p) => p.id !== project.id).slice(0, 5));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, project.id]);

  // Sync draft when project.name changes
  useEffect(() => {
    setNameDraft(project.name);
  }, [project.name]);

  // Focus input when renaming
  useEffect(() => {
    if (isRenaming) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
    }
  }, [isRenaming]);

  // Click outside listener
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsSubmenuOpen(false);
        setIsRenaming(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsSubmenuOpen(false);
        setIsRenaming(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalDuration = project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0);

  const handleCommitRename = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === project.name) {
      setIsRenaming(false);
      return;
    }
    try {
      const res = await fetch(`http://localhost:3030/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        onUpdateProject(data.project);
        toast.success(`Project renamed to "${trimmed}"`);
      } else {
        onUpdateProject({ ...project, name: trimmed });
      }
    } catch {
      onUpdateProject({ ...project, name: trimmed });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDuplicate = async () => {
    setIsOpen(false);
    toast.info('Duplicating project...');
    try {
      const copyName = `${project.name} (Copy)`;
      const copyPath = `${project.projectRoot}_copy_${Date.now().toString(36)}`;
      const res = await fetch('http://localhost:3030/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: copyName,
          path: copyPath,
          aspectRatio: project.aspectRatio,
          targetDurationSec: project.targetDurationSec,
          emptyDAG: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        toast.success(`Created duplicate: "${copyName}"`);
        onSelectProject(data.project);
      } else {
        toast.error('Failed to duplicate project');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error duplicating project');
    }
  };

  const handleOpenRecentProject = async (projId: string) => {
    setIsOpen(false);
    setIsSubmenuOpen(false);
    try {
      const res = await fetch(`http://localhost:3030/api/projects/${projId}`);
      const data = await res.json();
      if (data && data.id) {
        onSelectProject(data);
        toast.success(`Opened project: ${data.name}`);
      }
    } catch {
      toast.error('Failed to open project');
    }
  };

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Active Project Switcher Pill */}
      {isRenaming ? (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-card border border-accent-primary shadow-sm">
          <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <input
            ref={renameInputRef}
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommitRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onBlur={handleCommitRename}
            className="w-40 bg-transparent text-xs font-bold text-text-primary focus:outline-none"
          />
          <button
            onClick={handleCommitRename}
            className="p-0.5 rounded text-text-muted hover:text-emerald-400 transition"
          >
            <Check className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1 rounded-xl bg-card hover:bg-subtle border border-subtle text-text-primary transition group shadow-sm"
          title="Project Options & Switcher (Cmd+O)"
        >
          <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-text-primary transition truncate max-w-[200px]">
            {project.name}
          </span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-app text-text-muted border border-subtle">
            {project.aspectRatio} • {totalDuration}s
          </span>
          <ChevronDown
            className={`w-3 h-3 text-text-muted group-hover:text-text-primary transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-surface/95 backdrop-blur-xl border border-subtle rounded-2xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-subtle">
          {/* Header Info */}
          <div className="px-2.5 py-2 border-b border-subtle">
            <div className="text-xs font-extrabold text-text-primary truncate">{project.name}</div>
            <div className="text-[10px] font-mono text-text-muted mt-0.5">
              {project.aspectRatio} • {totalDuration}s • {project.scenes.length} Scenes • {Object.keys(project.nodes).length} Nodes
            </div>
          </div>

          {/* Action 1: Inline Rename */}
          <button
            onClick={() => {
              setIsOpen(false);
              setIsRenaming(true);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
          >
            <Edit2 className="w-3.5 h-3.5 text-text-muted" />
            <span>Rename Project...</span>
          </button>

          {/* Action 2: Duplicate Project */}
          <button
            onClick={handleDuplicate}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
          >
            <Copy className="w-3.5 h-3.5 text-text-muted" />
            <span>Duplicate Project</span>
          </button>

          {/* Action 3: Export DaVinci Bundle */}
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenDaVinciExport();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
          >
            <Film className="w-3.5 h-3.5 text-text-muted" />
            <span>Export DaVinci Bundle</span>
          </button>

          {/* Action 4: Project Settings */}
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenProjectSettings();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
          >
            <Settings className="w-3.5 h-3.5 text-text-muted" />
            <span>Project Settings</span>
            <span className="ml-auto text-[9px] font-mono text-text-muted bg-app px-1 rounded border border-subtle">
              ⌘,
            </span>
          </button>

          <div className="w-full h-[1px] bg-subtle my-1" />

          {/* Action 5: Open Projects Submenu */}
          <div
            className="relative"
            onMouseEnter={() => setIsSubmenuOpen(true)}
            onMouseLeave={() => setIsSubmenuOpen(false)}
          >
            <button
              onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Projects</span>
              </div>
              <ChevronRight className="w-3 h-3 text-text-muted" />
            </button>

            {/* Submenu for Recent Projects */}
            {isSubmenuOpen && (
              <div className="absolute left-full top-0 ml-1.5 w-60 bg-surface/95 backdrop-blur-xl border border-subtle rounded-2xl shadow-2xl p-1.5 z-50 space-y-1 animate-scale-in">
                <div className="px-2 py-1 text-[9px] font-mono uppercase font-bold text-text-muted border-b border-subtle">
                  Recent Projects
                </div>
                {recentProjects.length > 0 ? (
                  recentProjects.map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => handleOpenRecentProject(rec.id)}
                      className="w-full text-left px-2 py-1.5 rounded-xl text-xs text-text-primary hover:bg-card transition group flex flex-col"
                    >
                      <span className="font-bold truncate group-hover:text-accent-primary transition">
                        {rec.name}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted">
                        {rec.aspectRatio} • {rec.targetDurationSec}s
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-2 text-[10px] text-text-muted italic">No other recent projects</div>
                )}

                <div className="w-full h-[1px] bg-subtle my-1" />

                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsSubmenuOpen(false);
                    onOpenProjectsHub();
                  }}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-bold text-accent-primary hover:bg-card transition text-left"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>View All Projects... (⌘O)</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-full h-[1px] bg-subtle my-1" />

          {/* Action 6: Delete Project */}
          <button
            onClick={() => {
              setIsOpen(false);
              onDeleteProject();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-rose-500 hover:bg-rose-500/10 transition text-left"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete Project...</span>
          </button>
        </div>
      )}
    </div>
  );
};
