import React, { useState } from 'react';
import { FilmProject, SubjectVariant } from '../../types.js';
import { X, Plus, Trash2, Check, User, Box, MapPin, Sparkles, Image as ImageIcon } from 'lucide-react';

interface SubjectManagerModalProps {
  project: FilmProject;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updated: FilmProject) => void;
}

export const SubjectManagerModal: React.FC<SubjectManagerModalProps> = ({
  project,
  isOpen,
  onClose,
  onUpdateProject,
}) => {
  const subjects = project.subjectAnchors || [];
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'character' | 'product' | 'environment' | 'prop'>('character');
  const [coreDescription, setCoreDescription] = useState('');
  const [variants, setVariants] = useState<SubjectVariant[]>([]);
  const [activeVariantId, setActiveVariantId] = useState<string>('');

  // Keyboard Escape listener
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Synchronize selection
  React.useEffect(() => {
    if (isCreatingNew) {
      setName('');
      setCategory('character');
      setCoreDescription('');
      setVariants([
        {
          id: `var_${Date.now()}`,
          label: 'Default Visual',
          promptDescription: '',
          isDefault: true,
          createdAt: Date.now(),
        },
      ]);
      setActiveVariantId(`var_${Date.now()}`);
      return;
    }

    const current = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
    if (current) {
      setSelectedSubjectId(current.id);
      setName(current.name);
      setCategory(current.category);
      setCoreDescription(current.coreDescription);
      setVariants(current.variants || []);
      setActiveVariantId(current.activeVariantId || current.variants?.[0]?.id || '');
    } else {
      setSelectedSubjectId('');
      setName('');
      setCategory('character');
      setCoreDescription('');
      setVariants([]);
      setActiveVariantId('');
    }
  }, [selectedSubjectId, isCreatingNew, isOpen]);

  if (!isOpen) return null;

  const handleStartNewSubject = () => {
    setIsCreatingNew(true);
    setSelectedSubjectId('');
  };

  const handleSelectSubject = (id: string) => {
    setIsCreatingNew(false);
    setSelectedSubjectId(id);
  };

  const handleAddVariant = () => {
    const newVarId = `var_${Date.now()}`;
    const newVariant: SubjectVariant = {
      id: newVarId,
      label: `Variant ${variants.length + 1}`,
      promptDescription: '',
      isDefault: false,
      createdAt: Date.now(),
    };
    setVariants([...variants, newVariant]);
    setActiveVariantId(newVarId);
  };

  const handleUpdateVariant = (varId: string, partial: Partial<SubjectVariant>) => {
    setVariants(
      variants.map((v) => (v.id === varId ? { ...v, ...partial } : v))
    );
  };

  const handleRemoveVariant = (varId: string) => {
    if (variants.length <= 1) return;
    const remaining = variants.filter((v) => v.id !== varId);
    setVariants(remaining);
    if (activeVariantId === varId) {
      setActiveVariantId(remaining[0].id);
    }
  };

  const handleSetActiveVariant = (varId: string) => {
    setActiveVariantId(varId);
    setVariants(
      variants.map((v) => ({
        ...v,
        isDefault: v.id === varId,
      }))
    );
  };

  const handleSaveSubject = async () => {
    if (!name.trim() || !coreDescription.trim()) return;
    setIsSaving(true);

    try {
      const payload = {
        id: isCreatingNew ? undefined : selectedSubjectId,
        name: name.trim(),
        category,
        coreDescription: coreDescription.trim(),
        variants: variants.map((v) => ({
          ...v,
          promptDescription: v.promptDescription.trim() || coreDescription.trim(),
          isDefault: v.id === activeVariantId,
        })),
        activeVariantId,
      };

      const res = await fetch(`/api/projects/${project.id}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        onUpdateProject({
          ...project,
          subjectAnchors: data.subjects,
        });
        setIsCreatingNew(false);
        setSelectedSubjectId(data.subjectId || selectedSubjectId);
      }
    } catch (err) {
      console.error('Failed to save subject anchor:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm('Delete this subject anchor from the project?')) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/subjects/${subjectId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onUpdateProject({
          ...project,
          subjectAnchors: data.subjects,
        });
        setIsCreatingNew(false);
        setSelectedSubjectId(data.subjects[0]?.id || '');
      }
    } catch (err) {
      console.error('Failed to delete subject anchor:', err);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'character':
        return <User className="w-3.5 h-3.5 text-accent-primary" />;
      case 'product':
        return <Box className="w-3.5 h-3.5 text-amber-400" />;
      case 'environment':
        return <MapPin className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-4xl h-[85vh] bg-surface border border-subtle rounded-lg shadow-2xl overflow-hidden text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-card border border-subtle text-accent-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-primary tracking-tight">Project Subject Anchors & Asset Manager</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-card border border-subtle text-accent-primary">
                  {subjects.length} Anchors
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Preserve characters, presenters, and products across scenes. Turnarounds stored in <code className="font-mono text-text-primary">assets/subjects/</code>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex flex-1 min-h-0">
          {/* Left: Subjects Roster */}
          <div className="w-72 border-r border-subtle bg-surface/50 flex flex-col p-3 space-y-2 overflow-y-auto">
            <button
              onClick={handleStartNewSubject}
              className={`w-full py-2 px-3 rounded border flex items-center justify-center gap-2 text-xs font-semibold transition ${
                isCreatingNew
                  ? 'bg-accent-primary text-app border-accent-primary shadow-sm font-bold'
                  : 'bg-card border-subtle text-text-muted hover:border-text-muted/40 hover:text-text-primary'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              New Subject Anchor
            </button>

            <div className="text-[10px] uppercase font-mono tracking-wider text-text-muted px-1 pt-2">
              Project Roster
            </div>

            {subjects.length === 0 && !isCreatingNew ? (
              <div className="p-4 text-center text-xs text-text-muted rounded border border-dashed border-subtle">
                No subjects defined yet. Add a presenter, character, or hero product anchor to lock consistency across shots.
              </div>
            ) : (
              subjects.map((sub) => {
                const isSelected = !isCreatingNew && sub.id === selectedSubjectId;
                const activeVar = sub.variants.find((v) => v.id === sub.activeVariantId) || sub.variants[0];
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleSelectSubject(sub.id)}
                    className={`p-3 rounded border cursor-pointer transition text-left relative group ${
                      isSelected
                        ? 'bg-card border-accent-primary text-text-primary shadow-sm ring-1 ring-accent-primary/40'
                        : 'bg-card border-subtle text-text-muted hover:border-text-muted/40 hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs truncate text-text-primary">
                        {getCategoryIcon(sub.category)}
                        <span className="truncate">{sub.name}</span>
                      </div>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface text-text-muted border border-subtle">
                        {sub.variants.length} var
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                      {sub.coreDescription}
                    </p>
                    {activeVar && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-accent-primary font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-primary"></span>
                        <span className="truncate">{activeVar.label}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Anchor Details & Variant Editor */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6 bg-surface">
            {(isCreatingNew || selectedSubjectId) ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-subtle">
                  <div className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    {isCreatingNew ? 'Create New Anchor' : 'Edit Subject Anchor'}
                  </div>
                  {!isCreatingNew && (
                    <button
                      onClick={() => handleDeleteSubject(selectedSubjectId)}
                      className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Anchor
                    </button>
                  )}
                </div>

                {/* Core Anchor Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Anchor Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Anya - Lead Presenter, Liquid Glass Server"
                      className="w-full p-2.5 rounded-lg bg-card border border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full p-2.5 rounded-lg bg-card border border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                    >
                      <option value="character">Character / Presenter</option>
                      <option value="product">Hero Product</option>
                      <option value="environment">Environment / Location</option>
                      <option value="prop">Key Prop</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Core Physical Traits & Materials
                  </label>
                  <textarea
                    value={coreDescription}
                    onChange={(e) => setCoreDescription(e.target.value)}
                    rows={2}
                    placeholder="e.g. Female tech founder, early 30s, sharp features, short dark hair, natural studio makeup, minimalist professional demeanor"
                    className="w-full p-2.5 rounded-lg bg-card border border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-primary resize-none font-mono"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    This core identity description is auto-injected into every scene referencing this subject.
                  </p>
                </div>

                {/* Visual Variants Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-accent-primary" />
                        Visual Variants & Turnarounds
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Different costumes, angles, or states for this subject. Active variant is passed to Image-to-Video models.
                      </p>
                    </div>
                    <button
                      onClick={handleAddVariant}
                      className="px-2.5 py-1.5 rounded-lg bg-card border border-subtle hover:border-accent-primary text-xs font-medium text-text-primary flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3 h-3 text-accent-primary" />
                      Add Variant
                    </button>
                  </div>

                  <div className="space-y-3">
                    {variants.map((v, idx) => {
                      const isActive = v.id === activeVariantId;
                      return (
                        <div
                          key={v.id}
                          className={`p-3.5 rounded border transition ${
                            isActive
                              ? 'bg-card border-accent-primary shadow-sm ring-1 ring-accent-primary/40'
                              : 'bg-card border-subtle'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSetActiveVariant(v.id)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition ${
                                  isActive
                                    ? 'bg-accent-primary text-app'
                                    : 'bg-surface text-text-muted hover:text-text-primary border border-subtle'
                                }`}
                              >
                                {isActive && <Check className="w-2.5 h-2.5" />}
                                {isActive ? 'ACTIVE VARIANT' : 'Set as Active'}
                              </button>
                              <span className="text-xs font-semibold text-text-primary">
                                Variant {idx + 1}
                              </span>
                            </div>

                            {variants.length > 1 && (
                              <button
                                onClick={() => handleRemoveVariant(v.id)}
                                className="text-text-muted hover:text-rose-400 p-1 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-3 mb-2">
                            <div className="col-span-1">
                              <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">
                                Variant Label
                              </label>
                              <input
                                type="text"
                                value={v.label}
                                onChange={(e) => handleUpdateVariant(v.id, { label: e.target.value })}
                                placeholder="e.g. Charcoal Blazer, Casual Tee"
                                className="w-full p-2 rounded bg-app border border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">
                                Reference Image / Turnaround Path
                              </label>
                              <input
                                type="text"
                                value={v.mediaUrl || ''}
                                onChange={(e) => handleUpdateVariant(v.id, { mediaUrl: e.target.value })}
                                placeholder="e.g. assets/subjects/anya/var_01.png"
                                className="w-full p-2 rounded bg-app border border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-primary font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">
                              Variant Costume & Specific Features
                            </label>
                            <input
                              type="text"
                              value={v.promptDescription}
                              onChange={(e) => handleUpdateVariant(v.id, { promptDescription: e.target.value })}
                              placeholder="e.g. Wearing tailored charcoal wool blazer over crisp white silk collarless shirt"
                              className="w-full p-2 rounded bg-app border border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-primary font-mono"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Save Button */}
                <div className="pt-4 border-t border-subtle flex justify-end gap-2">
                  <button
                    onClick={handleSaveSubject}
                    disabled={isSaving || !name.trim() || !coreDescription.trim()}
                    className="px-5 py-2.5 rounded bg-accent-primary hover:opacity-90 disabled:opacity-50 text-app font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
                  >
                    <Check className="w-4 h-4" />
                    {isSaving ? 'Preserving...' : 'Save Subject Anchor'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-muted text-xs text-center p-8">
                <User className="w-10 h-10 mb-2 text-text-muted/40" />
                Select a subject from the project roster or create a new anchor.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
