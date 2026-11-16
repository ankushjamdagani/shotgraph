import { useDialog } from '../common/useDialog';
import { apiFetch } from '../../services/api';
import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  X,
  FolderOpen,
  Check,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { FilmProject, ModelEngine } from '../../types';

interface NewProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: FilmProject) => void;
}

interface StoryBeat {
  label: string;
  text: string;
}

interface StoryVariation {
  id: number;
  title: string;
  durationLabel: string;
  beats: StoryBeat[];
  audioFreq: number;
  audioType: OscillatorType;
}

interface AIMoodOption {
  key: string;
  title: string;
  desc: string;
  isRecommended: boolean;
}

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  // Navigation
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isExiting, setIsExiting] = useState(false);

  // Step 1: Creative Concept & Location
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [isPickingDir, setIsPickingDir] = useState(false);

  // Step 2: Specs & Duration
  const [selectedAspect, setSelectedAspect] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [customSpecs, setCustomSpecs] = useState('');

  // Step 3: Emotional Mood & Real AI Analysis
  const [selectedMood, setSelectedMood] = useState('⚡ Adrenaline & Speed');
  const [customMood, setCustomMood] = useState('');
  const [aiMoods, setAiMoods] = useState<AIMoodOption[]>([]);
  const [isAiAnalyzingMood, setIsAiAnalyzingMood] = useState(false);
  const [aiMoodError, setAiMoodError] = useState<string | null>(null);

  // Step 4: AI Model Engine & Directives
  const [selectedModel, setSelectedModel] = useState<ModelEngine>('antigravity-cli');
  const [customDirective, setCustomDirective] = useState('');

  // Step 5: Story Directions & Ambient Loading
  const [isAmbientGenerating, setIsAmbientGenerating] = useState(false);
  const [ambientStatus, setAmbientStatus] = useState('Directing camera optics...');
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set([1]));
  const [customVariations, setCustomVariations] = useState<StoryVariation[]>([]);
  const [refinePrompt, setRefinePrompt] = useState('');

  // Step 6: Visual Aesthetic
  const [branchAesthetics, setBranchAesthetics] = useState<Record<number, string>>({
    1: 'Liquid Glass',
    2: 'Editorial 35mm',
    3: 'Pop Kinetic',
  });
  const [customAesthetics, setCustomAesthetics] = useState<Record<number, string>>({});

  // Reference URLs per step
  const [stepUrls, setStepUrls] = useState<Record<number, string[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  });

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Input Refs for Auto-Focus
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const specsInputRef = useRef<HTMLInputElement | null>(null);
  const moodInputRef = useRef<HTMLTextAreaElement | null>(null);
  const directiveInputRef = useRef<HTMLInputElement | null>(null);
  const refineInputRef = useRef<HTMLInputElement | null>(null);
  const aestheticInputRef = useRef<HTMLInputElement | null>(null);

  // Initial Storyboard Variations
  const [initialVariations, setInitialVariations] = useState<StoryVariation[]>([]);
  const generation = useRef<AbortController | null>(null);
  useEffect(()=>()=>generation.current?.abort(),[]);

  const allVariations = [...initialVariations, ...customVariations];

  // Helper: Extract URLs from text
  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex) || [];
    return [...new Set(matches)];
  };

  const formatUrlLabel = (url: string) => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace('www.', '');
      let p = u.pathname;
      if (p.length > 16) p = p.slice(0, 16) + '…';
      return `${host}${p}`;
    } catch {
      return url.slice(0, 20);
    }
  };

  const handleTextChangeWithUrlExtraction = (
    stepNum: number,
    text: string,
    setText: (s: string) => void
  ) => {
    setText(text);
    const urls = extractUrls(text);
    setStepUrls((prev) => ({ ...prev, [stepNum]: urls }));
  };

  const removeUrl = (stepNum: number, urlToRemove: string) => {
    setStepUrls((prev) => ({
      ...prev,
      [stepNum]: (prev[stepNum] || []).filter((u) => u !== urlToRemove),
    }));
  };

  // Auto-focus on primary input when step changes
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (currentStep === 1) promptInputRef.current?.focus();
      else if (currentStep === 2) specsInputRef.current?.focus();
      else if (currentStep === 3) moodInputRef.current?.focus();
      else if (currentStep === 4) directiveInputRef.current?.focus();
      else if (currentStep === 5) refineInputRef.current?.focus();
      else if (currentStep === 6) aestheticInputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [currentStep, isOpen]);

  // Keyboard navigation: ⌘+Enter to advance, Esc to go back
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (currentStep === 1) submitStep1AndTriggerAiMood();
        else if (currentStep === 2) advanceToStep(3);
        else if (currentStep === 3) advanceToStep(4);
        else if (currentStep === 4) triggerAmbientGeneration();
        else if (currentStep === 5) advanceToStep(6);
        else if (currentStep === 6) advanceToStep(7);
        else if (currentStep === 7) handleStartProduction();
      }

      if (e.key === 'Escape') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          if (currentStep > 1) {
            goBack();
          } else {
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, prompt, title, selectedCards, branchAesthetics]);

  const dialogRef = useDialog(isOpen, onClose);
  if (!isOpen) return null;

  // Real AI Mood Call (Asynchronous prefetch on Step 1 submit)
  const triggerAiMoodAnalysis = async (premisePrompt: string) => {
    const textToAnalyze = premisePrompt.trim() || 'A high-impact cinematic film concept';
    setIsAiAnalyzingMood(true);
    setAiMoodError(null);

    try {
      const res = await apiFetch('http://localhost:3030/api/ai/suggest-moods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToAnalyze,
          modelEngine: selectedModel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.moods) && data.moods.length > 0) {
        setAiMoods(data.moods);
        const recommended = data.moods.find((m: AIMoodOption) => m.isRecommended) || data.moods[0];
        if (recommended) {
          setSelectedMood(recommended.title);
          if (!customMood) setCustomMood(recommended.desc);
        }
      } else {
        setAiMoodError(data.error || 'Failed to extract mood with AI runner.');
      }
    } catch (err: any) {
      setAiMoodError(err.message || 'Network error connecting to AI runner.');
    } finally {
      setIsAiAnalyzingMood(false);
    }
  };

  // Step 1: Submit & trigger real AI mood model
  const submitStep1AndTriggerAiMood = () => {
    triggerAiMoodAnalysis(prompt);
    advanceToStep(2);
  };

  // Step 2: Skip specs
  const skipStep2WithDefaults = () => {
    setSelectedAspect('9:16');
    setSelectedDuration(30);
    advanceToStep(3);
  };

  // Step 4: Skip AI generation direct to Studio
  const skipDirectToStudio = () => {
    handleStartProduction(true);
  };

  // Step 5: Ambient breathing generation
  const triggerAmbientGeneration = async () => {
    advanceToStep(5);setIsAmbientGenerating(true);setAmbientStatus('Generating story directions…');setErrorMsg('');
    generation.current?.abort();const controller=new AbortController();generation.current=controller;
    try {
      const response=await apiFetch('/api/ai/story-directions',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt.trim()||title,duration:selectedDuration,modelEngine:selectedModel,mood:customMood||selectedMood,directive:customDirective})});
      const data=await response.json();
      const directions:StoryVariation[]=data.directions.map((item:any,index:number)=>({...item,id:index+1,durationLabel:`${selectedDuration}s • ${item.beats.length} beats`,audioFreq:0,audioType:'sine'}));
      setInitialVariations(directions);setSelectedCards(new Set([directions[0].id]));
    } catch(error) {if(!controller.signal.aborted)setErrorMsg((error as Error).message);}
    finally{if(!controller.signal.aborted)setIsAmbientGenerating(false);}
  };

  const toggleCardPick = (id: number) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addCustomVariation = () => {
    if (!refinePrompt.trim()) return;
    const newId = 100 + customVariations.length + 1;
    const newVar: StoryVariation = {
      id: newId,
      title: refinePrompt.slice(0, 32) + (refinePrompt.length > 32 ? '…' : ''),
      durationLabel: `${selectedDuration}s • Custom Beat`,
      audioFreq: 300,
      audioType: 'sine',
      beats: [
        {
          label: 'Custom Direction',
          text: refinePrompt.trim(),
        },
      ],
    };

    setCustomVariations((prev) => [...prev, newVar]);
    setSelectedCards((prev) => new Set([...prev, newId]));
    setBranchAesthetics((prev) => ({ ...prev, [newId]: 'Liquid Glass' }));
    setRefinePrompt('');
  };

  // Step 6: Skip aesthetic
  const skipStep6WithDefault = () => {
    setBranchAesthetics((prev) => {
      const updated = { ...prev };
      selectedCards.forEach((id) => {
        updated[id] = 'Liquid Glass';
      });
      return updated;
    });
    advanceToStep(7);
  };

  // Native Finder directory picker
  const handlePickDirectory = async () => {
    setIsPickingDir(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('http://localhost:3030/api/projects/pick-directory', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.path) {
        setFolderPath(data.path);
      }
    } catch {
      // Ignored if cancelled
    } finally {
      setIsPickingDir(false);
    }
  };

  // Navigation handlers
  const advanceToStep = (step: number) => {
    setCurrentStep(step);
    dialogRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      dialogRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Final Action: Project Creation with Smooth Dissolve Transition
  const handleStartProduction = async (emptyDAG = false) => {
    setIsSubmitting(true);
    setErrorMsg('');

    const projectName = title.trim() || 'Untitled Video Project';
    const primaryAesthetic = branchAesthetics[Array.from(selectedCards)[0]] || 'Liquid Glass';

    const presetMap: Record<string, string> = {
      'Liquid Glass': 'liquid_glass',
      'Editorial 35mm': 'editorial_grain',
      'Pop Kinetic': 'kinetic_type',
      'Cyber Noir': 'liquid_glass',
    };

    // Format selected branches
    const branchesData = Array.from(selectedCards).map((cardId) => {
      const v = allVariations.find((item) => item.id === cardId);
      return {
        id: cardId,
        title: v?.title || `Track #${cardId}`,
        aesthetic: branchAesthetics[cardId] || 'Liquid Glass',
        customLook: customAesthetics[cardId] || '',
        beats: v?.beats || [],
      };
    });

    const allUrls = Object.values(stepUrls).flat();

    try {
      const res = await apiFetch('http://localhost:3030/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          path: folderPath ? folderPath.trim() : undefined,
          aspectRatio: selectedAspect,
          targetDurationSec: selectedDuration,
          basePresetId: presetMap[primaryAesthetic] || 'liquid_glass',
          ideaPrompt: prompt.trim() || projectName,
          emptyDAG,
          genesisConfig: {
            mood: selectedMood,
            customMood,
            modelEngine: selectedModel,
            directorDirective: customDirective,
            branches: branchesData,
            referenceUrls: allUrls,
            customSpecs,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        // Smooth cross-fade transition into the live studio canvas
        setIsExiting(true);
        setTimeout(() => {
          onProjectCreated(data.project);
          onClose();
        }, 320);
      } else {
        setErrorMsg(data.error || 'Failed to create project.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server connection error.');
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={dialogRef} aria-label="Create project"
      className={`studio-wizard fixed inset-0 z-50 bg-[#08080A] canvas-dots w-screen h-screen min-h-screen overflow-y-auto flex flex-col justify-between font-sans selection:bg-neutral-800 selection:text-white transition-all duration-300 ${
        isExiting ? 'opacity-0 scale-[0.98] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* ==================================================================== */}
      {/* TOP BAR: MINIMAL LOGO (LEFT) & CLOSE (RIGHT)                         */}
      {/* ==================================================================== */}
      <header className="h-14 px-6 md:px-12 flex items-center justify-between z-40 shrink-0 border-b border-[#222226]/40 bg-[#08080A]/80 backdrop-blur-md sticky top-0 select-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white text-black font-black text-xs flex items-center justify-center font-mono">
            VS
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">
            Project Genesis
          </span>
        </div>

        <button
          onClick={onClose}
          title="Close wizard"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* ==================================================================== */}
      {/* MAIN FORM CONTAINER (CENTERED WITH EDGE-TO-EDGE CANVAS DOTS)         */}
      {/* ==================================================================== */}
      {currentStep <= 4 && <div className="px-6 text-center"><button disabled={isSubmitting} onClick={()=>handleStartProduction(true)} className="px-5 py-2 border border-subtle rounded text-sm text-text-primary">Create project now · refine in studio</button></div>}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 md:py-12 flex flex-col justify-center relative pb-28">
        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="w-full transition-all duration-300">
          {/* ================================================================ */}
          {/* STEP 1: WHAT IS YOUR VISION FOR THIS FILM?                       */}
          {/* ================================================================ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  What is your vision for this film?
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Start with an idea, screenplay hook, or select a suggestion below. Paste links to parse references.
                </p>
              </div>

              <div className="space-y-3">
                {/* Title (Optional) */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project Title (Optional)"
                  className="w-full bg-transparent text-lg font-bold text-white placeholder-neutral-600 outline-none font-sans"
                />

                {/* Freeform Prompt Area (Auto-focused) */}
                <textarea
                  ref={promptInputRef}
                  rows={4}
                  value={prompt}
                  onChange={(e) =>
                    handleTextChangeWithUrlExtraction(1, e.target.value, setPrompt)
                  }
                  placeholder="Describe the story, hook, characters, or action... Paste URLs directly to auto-parse reference materials."
                  className="unboxed-input w-full text-base md:text-lg font-medium text-white placeholder-neutral-600 leading-relaxed font-sans"
                />

                {/* Reference URL Badges */}
                {stepUrls[1]?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {stepUrls[1].map((u) => (
                      <span
                        key={u}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300"
                      >
                        <span>🔗</span>
                        <a
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline max-w-[200px] truncate"
                        >
                          {formatUrlLabel(u)}
                        </a>
                        <button
                          onClick={() => removeUrl(1, u)}
                          className="text-neutral-500 hover:text-white ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggestions / Quick Starters */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  Suggestions / Quick Starters:
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <button
                    onClick={() => {
                      const t =
                        'Cyberpunk Sneaker Reveal: Neon rain puddle match cuts in Tokyo, sole carbon plate flex with heavy synth bass drops.';
                      setPrompt(t);
                      handleTextChangeWithUrlExtraction(1, t, setPrompt);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#151518] hover:bg-neutral-800 border border-[#222226] text-neutral-200 transition text-[11px]"
                  >
                    Cyberpunk Sneaker
                  </button>
                  <button
                    onClick={() => {
                      const t =
                        'SaaS AI Platform Tour: Minimalist liquid glass desktop, 10x workflow efficiency metric, free trial CTA.';
                      setPrompt(t);
                      handleTextChangeWithUrlExtraction(1, t, setPrompt);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#151518] hover:bg-neutral-800 border border-[#222226] text-neutral-200 transition text-[11px]"
                  >
                    SaaS Product Tour
                  </button>
                  <button
                    onClick={() => {
                      const t =
                        '35mm Founder Story: Handheld Portra warmth, vulnerable origin monologue on early manufacturing failures.';
                      setPrompt(t);
                      handleTextChangeWithUrlExtraction(1, t, setPrompt);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#151518] hover:bg-neutral-800 border border-[#222226] text-neutral-200 transition text-[11px]"
                  >
                    35mm Founder Origin
                  </button>
                  <button
                    onClick={() => {
                      const next = prompt ? `${prompt} https://vimeo.com/892134551` : 'https://vimeo.com/892134551';
                      setPrompt(next);
                      handleTextChangeWithUrlExtraction(1, next, setPrompt);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#151518] hover:bg-neutral-800 border border-[#222226] text-neutral-200 transition text-[11px]"
                  >
                    🔗 + Add Reference Link
                  </button>
                </div>
              </div>

              {/* Location Picker (Clean inline) */}
              <div className="pt-2 flex items-center justify-between text-xs font-mono text-neutral-400">
                <div className="flex items-center gap-2 truncate max-w-md">
                  <span className="text-neutral-500">Location:</span>
                  <span className="truncate text-neutral-300">
                    {folderPath || '~/Movies/VS_Projects/ (Default)'}
                  </span>
                </div>
                <button
                  onClick={handlePickDirectory}
                  disabled={isPickingDir}
                  className="px-2.5 py-1 rounded bg-[#151518] border border-[#222226] hover:bg-neutral-800 text-neutral-300 hover:text-white transition flex items-center gap-1.5 text-[11px]"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{isPickingDir ? 'Selecting...' : 'Change Folder'}</span>
                </button>
              </div>

              {/* Step 1 Footer */}
              <div className="pt-6 border-t border-[#222226]/60 flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-500 text-[11px]">
                  Submitting triggers real AI mood analysis
                </span>
                <button
                  onClick={submitStep1AndTriggerAiMood}
                  className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition active:scale-95 shadow"
                >
                  Next: Delivery Specs →
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 2: WHAT DELIVERY FORMAT AND DURATION ARE YOU TARGETING?     */}
          {/* ================================================================ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  What delivery format and duration are you targeting?
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Choose standard suggestions or specify custom delivery specs with references:
                </p>
              </div>

              {/* Aspect Ratio Cards */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Suggested Aspect Ratios:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div
                    onClick={() => setSelectedAspect('9:16')}
                    className={`p-4 rounded-xl bg-[#151518] cursor-pointer space-y-1 transition ${
                      selectedAspect === '9:16'
                        ? 'border-2 border-white'
                        : 'border border-[#222226] hover:border-neutral-500'
                    }`}
                  >
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>9:16 Vertical</span>
                      {selectedAspect === '9:16' && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-sans">
                      Reels, TikTok & Shorts (1080x1920)
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedAspect('16:9')}
                    className={`p-4 rounded-xl bg-[#151518] cursor-pointer space-y-1 transition ${
                      selectedAspect === '16:9'
                        ? 'border-2 border-white'
                        : 'border border-[#222226] hover:border-neutral-500'
                    }`}
                  >
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>16:9 Widescreen</span>
                      {selectedAspect === '16:9' && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-sans">
                      YouTube & Desktop (1920x1080)
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedAspect('1:1')}
                    className={`p-4 rounded-xl bg-[#151518] cursor-pointer space-y-1 transition ${
                      selectedAspect === '1:1'
                        ? 'border-2 border-white'
                        : 'border border-[#222226] hover:border-neutral-500'
                    }`}
                  >
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>1:1 Square</span>
                      {selectedAspect === '1:1' && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-sans">
                      Feed & Carousel (1080x1080)
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration Cards */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Suggested Durations:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  {[
                    { dur: 15, label: '15 Seconds', desc: 'Hook & Punchline Cut' },
                    { dur: 30, label: '30 Seconds', desc: 'Standard Commercial Arc' },
                    { dur: 60, label: '60 Seconds', desc: 'Deep Dive Narrative' },
                  ].map((d) => (
                    <div
                      key={d.dur}
                      onClick={() => setSelectedDuration(d.dur)}
                      className={`p-4 rounded-xl bg-[#151518] cursor-pointer space-y-1 transition ${
                        selectedDuration === d.dur
                          ? 'border-2 border-white'
                          : 'border border-[#222226] hover:border-neutral-500'
                      }`}
                    >
                      <div className="font-bold text-white flex items-center justify-between">
                        <span>{d.label}</span>
                        {selectedDuration === d.dur && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-sans">{d.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Specs Input */}
              <div className="space-y-2 pt-2 border-t border-[#222226]/60">
                <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Custom Format or Reference URL (Optional):
                </label>
                <input
                  ref={specsInputRef}
                  type="text"
                  value={customSpecs}
                  onChange={(e) =>
                    handleTextChangeWithUrlExtraction(2, e.target.value, setCustomSpecs)
                  }
                  placeholder="e.g. 2.39:1 Anamorphic, target 45s... paste benchmark video link..."
                  className="unboxed-input w-full text-sm font-sans text-white placeholder-neutral-600"
                />
              </div>

              {/* Step 2 Footer (With Back Button) */}
              <div className="pt-6 border-t border-[#222226]/60 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#151518] hover:bg-neutral-800 border border-[#222226] text-neutral-400 hover:text-white transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={skipStep2WithDefaults}
                    className="text-xs text-neutral-400 hover:text-white transition"
                  >
                    Skip (9:16 • 30s) →
                  </button>

                  <button
                    onClick={() => advanceToStep(3)}
                    className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition active:scale-95 shadow"
                  >
                    Next: Story Mood →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 3: WHAT EMOTIONAL MOOD OR ENERGY SHOULD THIS FILM EVOKE?    */}
          {/* ================================================================ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  What emotional mood or energy should this film evoke?
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Live AI-generated mood analysis based on your premise prompt:
                </p>
              </div>

              {/* AI In-Flight Loading State */}
              {isAiAnalyzingMood && (
                <div className="p-8 rounded-2xl bg-[#121215] border border-[#222226] text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-white mx-auto" />
                  <div className="text-xs font-mono text-white uppercase tracking-wider">
                    Analyzing premise tone, cut rhythm & sound design with AI model...
                  </div>
                  <p className="text-[11px] text-neutral-400 font-sans">
                    Extracting atmospheric pacing, lighting style, and acoustic signatures.
                  </p>
                </div>
              )}

              {/* AI Failure Error State (Strict AI Only) */}
              {!isAiAnalyzingMood && aiMoodError && (
                <div className="p-5 rounded-2xl bg-red-950/40 border border-red-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-300">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span>AI Mood Generation Error</span>
                  </div>
                  <p className="text-xs text-red-200/90 font-sans leading-relaxed">
                    {aiMoodError}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => triggerAiMoodAnalysis(prompt)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-xs font-mono text-white transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry AI Analysis</span>
                    </button>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      or enter your manual mood prompt below
                    </span>
                  </div>
                </div>
              )}

              {/* AI-Generated Mood Suggestions */}
              {!isAiAnalyzingMood && aiMoods.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    AI Suggested Moods (Click to select & populate prompt):
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    {aiMoods.map((m) => {
                      const isSelected = selectedMood === m.title;
                      return (
                        <div
                          key={m.key}
                          onClick={() => {
                            setSelectedMood(m.title);
                            setCustomMood(m.desc);
                          }}
                          className={`p-4 rounded-xl bg-[#151518] cursor-pointer space-y-2 transition ${
                            isSelected
                              ? 'border-2 border-white'
                              : 'border border-[#222226] hover:border-neutral-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{m.title}</span>
                            {m.isRecommended && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 font-mono border border-neutral-700">
                                AI Top Pick
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                            {m.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Mood Prompt & Reference Input */}
              <div className="space-y-2 pt-3 border-t border-[#222226]/60">
                <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Custom Mood Prompt & References:
                </label>
                <textarea
                  ref={moodInputRef}
                  rows={2}
                  value={customMood}
                  onChange={(e) =>
                    handleTextChangeWithUrlExtraction(3, e.target.value, setCustomMood)
                  }
                  placeholder="Describe pacing, sound design, camera energy, or paste reference links (Spotify track, Vimeo mood film)..."
                  className="unboxed-input w-full text-sm font-sans text-white placeholder-neutral-600 leading-relaxed"
                />
              </div>

              {/* Step 3 Footer (With Back Button) */}
              <div className="pt-6 border-t border-[#222226]/60 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#151518] hover:bg-neutral-800 border border-[#222226] text-neutral-400 hover:text-white transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  onClick={() => advanceToStep(4)}
                  className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition active:scale-95 shadow"
                >
                  Next: AI Model Engine →
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 4: WHICH AI MODEL SHOULD DIRECT AND STORYBOARD THIS FILM?   */}
          {/* ================================================================ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Which AI model should direct and storyboard this film?
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Select your intelligence engine, or provide custom directing guidance:
                </p>
              </div>

              {/* Model Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div
                  onClick={() => setSelectedModel('antigravity-cli')}
                  className={`p-5 rounded-2xl bg-[#151518] cursor-pointer space-y-2 transition ${
                    selectedModel === 'antigravity-cli'
                      ? 'border-2 border-white'
                      : 'border border-[#222226] hover:border-neutral-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Antigravity AI</span>
                    {selectedModel === 'antigravity-cli' && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="text-[10px] text-neutral-400">Local CLI Runner (Default)</div>
                  <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                    Fastest native engine with direct tool access, tuned on commercial cut pacing and scene rhythm.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedModel('claude-cli')}
                  className={`p-5 rounded-2xl bg-[#151518] cursor-pointer space-y-2 transition ${
                    selectedModel === 'claude-cli'
                      ? 'border-2 border-white'
                      : 'border border-[#222226] hover:border-neutral-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Claude 3.7 Sonnet</span>
                    {selectedModel === 'claude-cli' && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="text-[10px] text-neutral-400">Headless CLI Runner</div>
                  <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                    Nuanced narrative depth, rich character metaphors, and cinematic dialogue pacing.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedModel('ollama')}
                  className={`p-5 rounded-2xl bg-[#151518] cursor-pointer space-y-2 transition ${
                    selectedModel === 'ollama'
                      ? 'border-2 border-white'
                      : 'border border-[#222226] hover:border-neutral-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Ollama Local</span>
                    {selectedModel === 'ollama' && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="text-[10px] text-neutral-400">Air-Gapped GPU Runner</div>
                  <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                    100% offline and private local GPU inference without internet dependency.
                  </p>
                </div>
              </div>

              {/* Custom Directing Directives & References */}
              <div className="space-y-2 pt-2 border-t border-[#222226]/60">
                <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Director Directive / Style Rules (Optional):
                </label>
                <input
                  ref={directiveInputRef}
                  type="text"
                  value={customDirective}
                  onChange={(e) =>
                    handleTextChangeWithUrlExtraction(4, e.target.value, setCustomDirective)
                  }
                  placeholder="e.g. Direct with wide lingering shots, slow tension building, zero cliché voiceover... paste brief link..."
                  className="unboxed-input w-full text-sm font-sans text-white placeholder-neutral-600"
                />
              </div>

              {/* Bypass AI Generation */}
              <div className="pt-2">
                <button
                  onClick={skipDirectToStudio}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-[#222226] hover:border-neutral-500 bg-[#151518]/40 text-xs font-mono text-neutral-400 hover:text-white transition flex items-center justify-center gap-2"
                >
                  <span>Skip AI Storyboarding → Open canvas with raw prompt</span>
                </button>
              </div>

              {/* Step 4 Footer (With Back Button) */}
              <div className="pt-6 border-t border-[#222226]/60 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#151518] hover:bg-neutral-800 border border-[#222226] text-neutral-400 hover:text-white transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  onClick={triggerAmbientGeneration}
                  className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition active:scale-95 shadow"
                >
                  Generate Storyboards (⌘↵)
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 5: WHICH STORY DIRECTION(S) DO YOU WANT TO PRODUCE?         */}
          {/* ================================================================ */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* 1. Ambient Breathing Pulse Loading State */}
              {isAmbientGenerating && (
                <div className="py-16 text-center space-y-4">
                  <div className="animate-ambient-breathe inline-block">
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto mb-4" />
                    <div className="text-sm font-mono tracking-widest uppercase text-white font-medium">
                      {ambientStatus}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400 font-mono max-w-sm mx-auto">
                    Waiting for the selected engine. You can cancel and create a blank project.
                  </div>
                </div>
              )}

              {!isAmbientGenerating && errorMsg && <div role="alert" className="p-4 text-sm text-red-500">{errorMsg}<button className="ml-3 underline" onClick={triggerAmbientGeneration}>Retry generation</button><button className="ml-3 underline" onClick={()=>handleStartProduction(true)}>Create blank project</button></div>}
              {/* 2. Horizontally Arranged Minimal Story Cards (Inner box UI removed) */}
              {!isAmbientGenerating && (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                      Which story direction(s) do you want to produce?
                    </h2>
                    <p className="text-xs text-neutral-400 font-mono">
                      Select suggested directions, tweak beats, or add your own custom direction with references:
                    </p>
                  </div>

                  <div className="flex items-stretch gap-4 overflow-x-auto pb-4 snap-x">
                    {allVariations.map((v) => {
                      const isSelected = selectedCards.has(v.id);

                      return (
                        <div
                          key={v.id}
                          onClick={() => toggleCardPick(v.id)}
                          className={`w-80 md:w-96 shrink-0 rounded-2xl bg-[#101012] p-5 space-y-4 shadow-xl cursor-pointer transition flex flex-col justify-between snap-start ${
                            isSelected
                              ? 'border-2 border-white'
                              : 'border border-[#222226] hover:border-neutral-500'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleCardPick(v.id);
                                  }}
                                  className="w-4 h-4 accent-white rounded cursor-pointer"
                                />
                                <span className="text-xs font-bold text-white">{v.title}</span>
                              </div>
                              <span className="text-[10px] font-mono text-neutral-400">
                                {v.durationLabel}
                              </span>
                            </div>

                            {/* Formatted Beats (NO inner box UI) */}
                            <div className="space-y-3 text-xs text-neutral-400 font-sans leading-relaxed">
                              {v.beats.map((b, bIdx) => (
                                <div key={bIdx}>
                                  <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider block mb-0.5">
                                    {b.label}
                                  </span>
                                  <span className="text-neutral-200">{b.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>


                        </div>
                      );
                    })}
                  </div>

                  {/* Add Custom Direction or Refine with Prompt */}
                  <div className="space-y-2 pt-4 border-t border-[#222226]/60">
                    <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                      Add Custom Story Direction or Refine with References:
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        ref={refineInputRef}
                        type="text"
                        value={refinePrompt}
                        onChange={(e) =>
                          handleTextChangeWithUrlExtraction(5, e.target.value, setRefinePrompt)
                        }
                        placeholder="Describe a custom variation beat or instruction... paste screenplay / treatment link..."
                        className="unboxed-input flex-1 text-sm font-sans text-white placeholder-neutral-600"
                      />
                      <button
                        onClick={addCustomVariation}
                        className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-white transition shrink-0 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Custom Track</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 5 Footer (With Back Button) */}
                  <div className="pt-6 border-t border-[#222226]/60 flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={goBack}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#151518] hover:bg-neutral-800 border border-[#222226] text-neutral-400 hover:text-white transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <button
                      onClick={() => advanceToStep(6)}
                      className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition active:scale-95 shadow"
                    >
                      Next: Assign Aesthetic →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 6: WHAT VISUAL AESTHETIC SHOULD DEFINE EACH STORY BRANCH?   */}
          {/* ================================================================ */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  What visual aesthetic should define each story branch?
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Pick a suggested visual style or enter a custom look with moodboard references:
                </p>
              </div>

              <div className="space-y-4">
                {Array.from(selectedCards).map((varId, index) => {
                  const targetVar = allVariations.find((v) => v.id === varId);
                  const trackTitle = targetVar?.title || `Track #${varId}`;
                  const activeAes = branchAesthetics[varId] || 'Liquid Glass';
                  const customLookVal = customAesthetics[varId] || '';

                  const presets = [
                    { name: 'Liquid Glass', desc: 'Caustic glass reflections, clean dark typography' },
                    { name: 'Editorial 35mm', desc: 'Authentic Kodak Portra grain, warm halation, shallow focus' },
                    { name: 'Pop Kinetic', desc: 'Vibrant saturated pop colors, dynamic kinetic typography' },
                    { name: 'Cyber Noir', desc: 'Deep anamorphic contrast, neon rain puddles, atmospheric haze' },
                  ];

                  return (
                    <div
                      key={varId}
                      className="p-5 rounded-2xl bg-[#101012] border border-[#222226] space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold uppercase text-neutral-400">
                            Branch {index + 1}:
                          </span>
                          <span className="text-sm font-bold text-white">{trackTitle}</span>
                        </div>
                        <span className="text-xs font-mono text-white font-bold">
                          {activeAes}
                        </span>
                      </div>

                      {/* Suggestions Pills */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                          Suggested Aesthetics:
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {presets.map((p) => {
                            const isChosen = activeAes === p.name;
                            return (
                              <button
                                key={p.name}
                                onClick={() =>
                                  setBranchAesthetics((prev) => ({ ...prev, [varId]: p.name }))
                                }
                                className={`p-2.5 rounded-xl text-left border transition ${
                                  isChosen
                                    ? 'border-white bg-white text-black font-bold'
                                    : 'border-[#222226] bg-[#151518] text-neutral-300 hover:border-neutral-500'
                                }`}
                              >
                                <div className="text-xs">{p.name}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Look & Reference Link */}
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                          Or Custom Look & Reference Link:
                        </label>
                        <input
                          ref={index === 0 ? aestheticInputRef : undefined}
                          type="text"
                          value={customLookVal}
                          onChange={(e) =>
                            setCustomAesthetics((prev) => ({
                              ...prev,
                              [varId]: e.target.value,
                            }))
                          }
                          placeholder="e.g. David Fincher green tint, anamorphic lens flares... paste Behance/Pinterest moodboard..."
                          className="unboxed-input w-full text-xs font-sans text-neutral-200 placeholder-neutral-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 6 Footer (With Back Button) */}
              <div className="pt-6 border-t border-[#222226]/60 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#151518] hover:bg-neutral-800 border border-[#222226] text-neutral-400 hover:text-white transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={skipStep6WithDefault}
                    className="text-xs text-neutral-400 hover:text-white transition"
                  >
                    Skip (Use Liquid Glass Default) →
                  </button>

                  <button
                    onClick={() => advanceToStep(7)}
                    className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition active:scale-95 shadow"
                  >
                    Next: Review Production →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 7: READY TO DIRECT. START PRODUCTION?                       */}
          {/* ================================================================ */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Ready to direct. Start production?
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Your custom prompts, selected branches, and reference materials are ready to compile into your production DAG:
                </p>
              </div>

              {/* Side-by-side minimal track cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(selectedCards).map((varId, idx) => {
                  const targetVar = allVariations.find((v) => v.id === varId);
                  const titleStr = targetVar?.title || `Track #${varId}`;
                  const aes = branchAesthetics[varId] || 'Liquid Glass';
                  const customLook = customAesthetics[varId]
                    ? ` (${customAesthetics[varId].slice(0, 18)}…)`
                    : '';

                  return (
                    <div
                      key={varId}
                      className="p-5 rounded-2xl bg-[#101012] border border-[#222226] space-y-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-neutral-400 font-bold uppercase">
                            TRACK {idx + 1}
                          </span>
                          <span className="text-neutral-400">
                            {selectedAspect} • {selectedDuration}s
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">{titleStr}</h3>
                        <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                          Formatted screenplay breakdown initialized with timed scenes and dialogue beats.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#222226] flex items-center justify-between text-[11px] font-mono">
                        <span className="text-neutral-400">Visual Style:</span>
                        <span className="text-white font-bold">
                          {aes}
                          {customLook}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 7 Footer (With Back Button) */}
              <div className="pt-6 border-t border-[#222226]/60 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#151518] hover:bg-neutral-800 border border-[#222226] text-neutral-400 hover:text-white transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  onClick={() => handleStartProduction(false)}
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-neutral-200 transition active:scale-95 shadow-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Initializing Studio...</span>
                    </>
                  ) : (
                    <span>🎬 Start Production (⌘↵)</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================================================================== */}
      {/* FLOATING STEP DOTS (FIXED AT BOTTOM CENTER BELOW FORM)               */}
      {/* ==================================================================== */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#121215]/90 backdrop-blur-md border border-[#27272A]/80 shadow-2xl pointer-events-auto select-none">
        {[1, 2, 3, 4, 5, 6, 7].map((s) => {
          if (s === currentStep) {
            return (
              <div
                key={s}
                className="w-5 h-1.5 rounded-full bg-white transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                title="Current Step"
              />
            );
          }
          if (s < currentStep) {
            return (
              <button
                key={s}
                onClick={() => advanceToStep(s)}
                className="w-1.5 h-1.5 rounded-full bg-neutral-500 hover:bg-neutral-300 transition-all cursor-pointer"
                title={`Jump to step ${s}`}
              />
            );
          }
          return (
            <div
              key={s}
              className="w-1.5 h-1.5 rounded-full bg-neutral-800 transition-all"
              title={`Step ${s}`}
            />
          );
        })}
      </div>
    </div>
  );
};
