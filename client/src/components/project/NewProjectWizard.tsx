import { MoodPicker } from '../ui/mood-picker';
import { SetupProgress } from '../ui/setup-progress';
import { ProjectTitleField } from '../ui/project-title-field';
import { SetupActions } from '../ui/setup-actions';
import { Dialog as Primitive } from 'radix-ui';
import { Button, IconButton, Input, Textarea, Label, Checkbox } from '../ui';
import { ChoiceGroup } from '../ui/choice-group';
import { AsciiArt } from '../ui/ascii-art';
import { getDefaultStartAppearance } from '../ui/page-background';
import { getPageBackground } from '../ui/page-background';
import { Film } from 'lucide-react';
import { apiFetch } from '../../services/api';
import React, { useState, useEffect, useRef } from 'react';
import { X, FolderOpen, Plus, Loader2 } from 'lucide-react';
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
export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({ isOpen, onClose, onProjectCreated, }) => {
    // Navigation
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [furthestStep, setFurthestStep] = useState(1);
    const [isExiting, setIsExiting] = useState(false);
    // Step 1: Creative Concept & Location
    const [defaultLocation, setDefaultLocation] = useState<{path:string;separator:string} | null>(null);
    const [locationError, setLocationError] = useState(false);
    useEffect(() => {
      const controller = new AbortController();
      apiFetch('/api/projects/default-location', {signal:controller.signal})
        .then(async response => { if (!response.ok) throw new Error('Location unavailable'); return response.json(); })
        .then(data => { if (typeof data.path !== 'string') throw new Error('Location unavailable'); setDefaultLocation(data); })
        .catch(() => {if (!controller.signal.aborted) setLocationError(true);});
      return () => controller.abort();
    }, []);
    const [prompt, setPrompt] = useState('');
    const [title,setTitle] = useState('');
    const defaultFolderName = (title || 'Untitled Video Project').toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'untitled_project';
    const [folderPath, setFolderPath] = useState('');
    const displayedLocation = folderPath || (defaultLocation ? defaultLocation.path + defaultLocation.separator + defaultFolderName : locationError ? 'Location unavailable — choose a folder' : 'Loading save location…');
    const [isPickingDir, setIsPickingDir] = useState(false);
    // Step 2: Specs & Duration
    const [selectedAspect, setSelectedAspect] = useState<'9:16' | '16:9' | '1:1'>('9:16');
    const [selectedDuration, setSelectedDuration] = useState<number>(30);
    const [customSpecs, setCustomSpecs] = useState('');
    // Step 3: Emotional Mood & Real AI Analysis
    const [selectedMood, setSelectedMood] = useState('');
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
    const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
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
    const specsInputRef = useRef<HTMLTextAreaElement | null>(null);
    const moodInputRef = useRef<HTMLTextAreaElement | null>(null);
    const directiveInputRef = useRef<HTMLInputElement | null>(null);
    const refineInputRef = useRef<HTMLInputElement | null>(null);
    const aestheticInputRef = useRef<HTMLInputElement | null>(null);
    // Initial Storyboard Variations
    const [initialVariations, setInitialVariations] = useState<StoryVariation[]>([]);
    const generation = useRef<AbortController | null>(null);
    const moodGeneration = useRef<AbortController | null>(null);
    useEffect(() => () => { generation.current?.abort(); moodGeneration.current?.abort(); }, []);
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
            if (p.length > 16)
                p = p.slice(0, 16) + '…';
            return `${host}${p}`;
        }
        catch {
            return url.slice(0, 20);
        }
    };
    const handleTextChangeWithUrlExtraction = (stepNum: number, text: string, setText: (s: string) => void) => {
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
        if (!isOpen)
            return;
        const timer = setTimeout(() => {
            if (currentStep === 1)
                promptInputRef.current?.focus();
            else if (currentStep === 2)
                specsInputRef.current?.focus();
            else if (currentStep === 3)
                moodInputRef.current?.focus();
            else if (currentStep === 4)
                directiveInputRef.current?.focus();
            else if (currentStep === 5)
                refineInputRef.current?.focus();
            else if (currentStep === 6)
                aestheticInputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, [currentStep, isOpen]);
    const dialogRef = useRef<HTMLDivElement>(null);
    const opener = useRef(document.activeElement as HTMLElement | null);
    // Real AI Mood Call (Asynchronous prefetch on Step 1 submit)
    const triggerAiMoodAnalysis = async (premisePrompt: string) => {
        const textToAnalyze = premisePrompt.trim() || 'A high-impact cinematic film concept';
        moodGeneration.current?.abort();
        const controller = new AbortController();
        moodGeneration.current = controller;
        setIsAiAnalyzingMood(true);
        setAiMoodError(null);
        try {
            const res = await apiFetch('/api/ai/suggest-moods', {
                signal: controller.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: textToAnalyze,
                    modelEngine: selectedModel,
                }),
            });
            const data = await res.json();
            if (controller.signal.aborted) return;
            if (res.ok && data.success && Array.isArray(data.moods) && data.moods.length > 0) {
                setAiMoods(data.moods);

            }
            else {
                setAiMoodError(data.error || 'Failed to extract mood with AI runner.');
            }
        }
        catch (err: any) {
            if (controller.signal.aborted)
                return;
            setAiMoodError(err.message || 'Network error connecting to AI runner.');
        }
        finally {
            if (!controller.signal.aborted)
                setIsAiAnalyzingMood(false);
        }
    };
    // Step 1: Submit & trigger real AI mood model
    const submitStep1AndTriggerAiMood = () => {
        if (prompt.trim())
            void triggerAiMoodAnalysis(prompt);
        advanceToStep(2);
    };
    // Step 4: Skip AI generation direct to Studio
    const skipDirectToStudio = () => {
        handleStartProduction(true);
    };
    // Step 5: Ambient breathing generation
    const triggerAmbientGeneration = async () => {
        advanceToStep(5);
        setIsAmbientGenerating(true);
        setAmbientStatus('Generating story directions…');
        setErrorMsg('');
        generation.current?.abort();
        const controller = new AbortController();
        generation.current = controller;
        try {
            const response = await apiFetch('/api/ai/story-directions', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt.trim() || title, duration: selectedDuration, modelEngine: selectedModel, mood: customMood || selectedMood, directive: customDirective }) });
            const data = await response.json();
            if (!response.ok || !Array.isArray(data.directions) || !data.directions.length)
                throw new Error(data.error || 'No story directions returned. Try again or create a blank project.');
            const directions: StoryVariation[] = data.directions.map((item: any, index: number) => ({ ...item, id: index + 1, durationLabel: `${selectedDuration}s • ${item.beats.length} beats`, audioFreq: 0, audioType: 'sine' }));
            setInitialVariations(directions);
            setSelectedCards(new Set([directions[0].id]));
        }
        catch (error) {
            if (!controller.signal.aborted)
                setErrorMsg((error as Error).message);
        }
        finally {
            if (!controller.signal.aborted)
                setIsAmbientGenerating(false);
        }
    };
    const toggleCardPick = (id: number) => {
        setSelectedCards((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                if (next.size > 1)
                    next.delete(id);
            }
            else {
                next.add(id);
            }
            return next;
        });
    };
    const addCustomVariation = () => {
        if (!refinePrompt.trim())
            return;
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
    // Native Finder directory picker
    const handlePickDirectory = async () => {
        setIsPickingDir(true);
        setErrorMsg('');
        try {
            const res = await apiFetch('/api/projects/pick-directory', {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || 'Folder picker unavailable');
            if (data.path) {
                setFolderPath(data.path);
            }
        }
        catch {
            setErrorMsg('Could not open the folder picker. Enter a location manually or try again.');
        }
        finally {
            setIsPickingDir(false);
        }
    };
    // Navigation handlers
    const advanceToStep = (step: number) => {
        setCurrentStep(step);
        setFurthestStep(previous => Math.max(previous, step));
        setErrorMsg('');
        dialogRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    };
    const goBack = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
            dialogRef.current?.scrollTo({ top: 0, behavior: 'instant' });
        }
    };
    // Final Action: Project Creation with Smooth Dissolve Transition
    const handleStartProduction = async (emptyDAG = false) => {
        if (isSubmitting)
            return;
        generation.current?.abort();
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
            const res = await apiFetch('/api/projects/create', {
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
                        branches: emptyDAG ? [] : branchesData,
                        referenceUrls: allUrls,
                        customSpecs,
                    },
                }),
            });
            const data = await res.json();
            if (res.ok && data.success && data.project) {
                // Smooth cross-fade transition into the live studio canvas
                setIsExiting(true);
                setTimeout(() => {
                    onProjectCreated(data.project);
                    onClose();
                }, 320);
            }
            else {
                setErrorMsg(data.error || 'Failed to create project.');
                setIsSubmitting(false);
            }
        }
        catch (err: any) {
            setErrorMsg(err.message || 'Server connection error.');
            setIsSubmitting(false);
        }
    };
    const stepNames = ['Brief', 'Format', 'Mood', 'Engine', 'Story', 'Look', 'Review'];
    const headings = ['Start with an idea.', 'Give your film a format.', 'Set the mood.', 'Choose your creative engine.', 'Find your story direction.', 'Define the visual language.', 'Ready for the studio.'];
    const descriptions = ['Describe what you want to make. The details can follow.', 'Choose a canvas and target length. You can refine these in the studio.', 'Use a suggested direction or describe the feeling in your own words.', 'Choose a configured engine for story generation, or start with a blank canvas.', 'Select one or more directions, or write your own.', 'Choose a look for each selected story direction.', 'Review your setup before creating the project.'];
    const canContinue = !isSubmitting && !isAmbientGenerating && (currentStep !== 5 || allVariations.some(v => selectedCards.has(v.id)));
    const next = () => {
        if (!canContinue)
            return;
        setErrorMsg('');
        if (currentStep === 1)
            submitStep1AndTriggerAiMood();
        else if (currentStep === 4)
            void triggerAmbientGeneration();
        else if (currentStep === 7)
            void handleStartProduction();
        else
            advanceToStep(currentStep + 1);
    };
    const looks = ['Liquid Glass', 'Editorial 35mm', 'Pop Kinetic', 'Cyber Noir'];
    return <Primitive.Root open={isOpen} onOpenChange={open => { if (!open && !isSubmitting) {
        generation.current?.abort();
        onClose();
    } }}>
    <Primitive.Portal><Primitive.Overlay className="fixed inset-0 z-50 bg-app"/>
      <Primitive.Content aria-describedby="create-description" onOpenAutoFocus={event => { event.preventDefault(); promptInputRef.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }} onEscapeKeyDown={event => { if (isSubmitting)
        event.preventDefault(); }} className={`fixed inset-0 z-50 isolate flex flex-col overflow-hidden text-text-primary outline-none transition-opacity duration-normal motion-reduce:transition-none ${isExiting ? 'pointer-events-none opacity-0' : ''}`} style={getPageBackground()}>
        <AsciiArt appearance={getDefaultStartAppearance()} exclusionStyle="soft" />
        <header className="shrink-0 px-5 sm:px-10">
          <div data-art-exclusion className="mx-auto flex h-16 w-full max-w-[832px] px-4 sm:px-8 items-center justify-between gap-4">
            <div className="flex items-center gap-3"><Film className="size-5"/><span className="text-sm font-semibold">Shotgraph</span></div>
            <IconButton label="Close create project" disabled={isSubmitting} onClick={() => { generation.current?.abort(); onClose(); }}><X /></IconButton>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          <main className="flex min-h-0 flex-1 flex-col justify-center px-5 py-4 sm:px-10 sm:py-8">
            <form className="mx-auto flex min-h-0 w-full max-w-[832px] flex-1 flex-col px-4 sm:max-h-[800px] sm:px-8" onSubmit={event => { event.preventDefault(); next(); }} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); next(); } }}><fieldset disabled={isSubmitting} className="flex min-h-0 min-w-0 flex-1 flex-col border-0 p-0">
              <div data-art-exclusion><SetupProgress steps={stepNames} current={currentStep} furthest={furthestStep} disabled={isSubmitting || isAmbientGenerating} onSelect={advanceToStep}/></div>
              <div ref={dialogRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-1 pb-5 pt-4 [scrollbar-gutter:stable_both-edges]">
              <div data-art-exclusion className="space-y-3"><Primitive.Title className="text-3xl font-semibold tracking-tight">{headings[currentStep - 1]}</Primitive.Title><Primitive.Description id="create-description" className={currentStep <= 2 ? 'sr-only' : 'mt-3 text-sm leading-relaxed text-text-muted'}>{descriptions[currentStep - 1]}</Primitive.Description></div>
              {errorMsg && <div role="alert" className="rounded-md border border-danger p-4 break-words text-sm text-danger">{errorMsg}{currentStep === 5 && <Button variant="ghost" onClick={triggerAmbientGeneration} className="mt-3">Retry generation</Button>}</div>}
              {currentStep === 1 && <div className="space-y-6">
                <div data-art-exclusion><ProjectTitleField value={title} onChange={setTitle}/></div>
                <div data-art-exclusion className="space-y-4"><Label htmlFor="project-idea" className="block text-xs text-text-muted">Description</Label><Textarea variant="plain" id="project-idea" ref={promptInputRef} rows={5} className="min-h-48 text-xl leading-relaxed sm:min-h-56 sm:text-2xl" value={prompt} onChange={e => handleTextChangeWithUrlExtraction(1, e.target.value, setPrompt)} placeholder="A story, a scene, a character. What do you have in mind?" aria-describedby="idea-help"/><p id="idea-help" className="text-xs text-text-muted">Include reference links, or start with just a thought.</p></div>
                {stepUrls[1]?.length > 0 && <ul className="space-y-2">{stepUrls[1].map(url => <li key={url} className="flex items-center justify-between gap-3 text-xs"><a className="truncate underline" href={url} target="_blank" rel="noreferrer">{formatUrlLabel(url)}</a><IconButton label={`Remove reference ${formatUrlLabel(url)}`} onClick={() => removeUrl(1, url)}><X /></IconButton></li>)}</ul>}
                <div data-art-exclusion className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs"><FolderOpen className="size-4 shrink-0 text-text-muted"/><span className="text-text-muted">Save to</span><span className="min-w-0 max-w-full break-all sm:max-w-lg" title={displayedLocation}>{displayedLocation}</span><Button variant="soft" size="sm" loading={isPickingDir} onClick={handlePickDirectory}>Change folder</Button></div>
              </div>}
              {currentStep === 2 && <div data-art-exclusion className="space-y-7"><section className="space-y-3"><h2 className="text-sm font-medium">Aspect ratio</h2><ChoiceGroup label="Aspect ratio" value={selectedAspect} onChange={v => setSelectedAspect(v as typeof selectedAspect)} options={[{ value: '9:16', label: 'Portrait · 9:16', description: '1080 × 1920' }, { value: '16:9', label: 'Landscape · 16:9', description: '1920 × 1080' }, { value: '1:1', label: 'Square · 1:1', description: '1080 × 1080' }]}/></section><section className="space-y-3"><h2 className="text-sm font-medium">Target duration</h2><ChoiceGroup label="Target duration" value={String(selectedDuration)} onChange={v => setSelectedDuration(Number(v))} options={[15, 30, 60].map(n => ({ value: String(n), label: `${n} seconds` }))}/></section><div className="space-y-2"><Label htmlFor="project-specs">Creative notes <span className="font-normal text-text-muted">(optional)</span></Label><Textarea variant="plain" id="project-specs" ref={specsInputRef} value={customSpecs} onChange={e => handleTextChangeWithUrlExtraction(2, e.target.value, setCustomSpecs)} rows={3} placeholder="For example: a slow opening, quick cuts at the end, or a reference film to follow." aria-describedby="format-notes-help"/><p id="format-notes-help" className="text-xs text-text-muted">These notes guide the story. Canvas and duration use the choices above.</p></div></div>}
              {currentStep === 3 && <div data-art-exclusion className="space-y-6">
                <MoodPicker value={selectedMood} onChange={(title,description)=>{setSelectedMood(title);setCustomMood(description);}} suggestion={aiMoods.find(mood=>mood.isRecommended)||aiMoods[0]} loading={isAiAnalyzingMood} error={!!aiMoodError} hasIdea={!!prompt.trim()} onRetry={()=>triggerAiMoodAnalysis(prompt)}/>
                <div className="space-y-2"><Label htmlFor="project-mood">Mood notes and references</Label><Textarea variant="plain" id="project-mood" ref={moodInputRef} value={customMood} onChange={e=>handleTextChangeWithUrlExtraction(3,e.target.value,setCustomMood)} placeholder="Add a detail about pacing, sound, lighting or camera energy."/></div>
              </div>}
              {currentStep === 4 && <div data-art-exclusion className="space-y-6"><ChoiceGroup label="AI engine" value={selectedModel} onChange={v => setSelectedModel(v as ModelEngine)} options={[{ value: 'antigravity-cli', label: 'Antigravity', description: 'Local CLI runner' }, { value: 'claude-cli', label: 'Claude Code', description: 'Configured Claude runner' }, { value: 'ollama', label: 'Ollama', description: 'Local model runner' }]}/><p className="text-xs text-text-muted">The selected engine must be configured on your machine.</p><div className="space-y-2"><Label htmlFor="project-directive">Directing guidance</Label><Input variant="plain" id="project-directive" ref={directiveInputRef} value={customDirective} onChange={e => handleTextChangeWithUrlExtraction(4, e.target.value, setCustomDirective)} placeholder="What should the engine pay special attention to?"/></div></div>}
              {currentStep === 5 && <div data-art-exclusion className="space-y-6">{isAmbientGenerating ? <div role="status" className="space-y-4 py-10"><Loader2 className="size-6 animate-spin"/><p className="text-sm">{ambientStatus}</p><p className="text-xs text-text-muted">You can create a blank project while the engine is working.</p></div> : <>{allVariations.map(v => <section key={v.id} className="space-y-4 rounded-thumbnail border border-subtle p-5"><label className="flex cursor-pointer items-center gap-3 text-sm font-semibold"><Checkbox checked={selectedCards.has(v.id)} onCheckedChange={() => toggleCardPick(v.id)}/>{v.title}</label><p className="text-xs text-text-muted">{v.durationLabel}</p><dl className="space-y-3">{v.beats.map((beat, i) => <div key={i}><dt className="text-xs font-medium">{beat.label}</dt><dd className="mt-1 text-sm leading-relaxed text-text-muted">{beat.text}</dd></div>)}</dl></section>)}<div className="space-y-2"><Label htmlFor="custom-story">Add your own direction</Label><div className="flex gap-2"><Input variant="plain" id="custom-story" ref={refineInputRef} value={refinePrompt} onChange={e => handleTextChangeWithUrlExtraction(5, e.target.value, setRefinePrompt)} placeholder="Describe a story direction"/><Button variant="secondary" borderTone="subtle" disabled={!refinePrompt.trim()} onClick={addCustomVariation}><Plus />Add</Button></div></div></>}</div>}
              {currentStep === 6 && <div data-art-exclusion className="space-y-8">{Array.from(selectedCards).map((id, index) => <section key={id} className="space-y-4"><h2 className="text-sm font-semibold">{allVariations.find(v => v.id === id)?.title || `Direction ${index + 1}`}</h2><ChoiceGroup label={`Look for direction ${index + 1}`} className="sm:grid-cols-2" value={branchAesthetics[id] || 'Liquid Glass'} onChange={value => setBranchAesthetics(prev => ({ ...prev, [id]: value }))} options={looks.map(value => ({ value, label: value }))}/><div className="space-y-2"><Label htmlFor={`look-${id}`}>Custom look and references</Label><Input variant="plain" id={`look-${id}`} ref={index === 0 ? aestheticInputRef : undefined} value={customAesthetics[id] || ''} onChange={e => setCustomAesthetics(prev => ({ ...prev, [id]: e.target.value }))} placeholder="Lighting, texture, lenses or moodboard links"/></div></section>)}</div>}
              {currentStep === 7 && <div data-art-exclusion className="space-y-6"><dl className="divide-y divide-subtle">{[['Project', title.trim() || 'Untitled Video Project'], ['Location', displayedLocation], ['Format', `${selectedAspect} · ${selectedDuration} seconds`], ['Engine', selectedModel], ['Mood', customMood || selectedMood || 'Not specified']].map(([label, value]) => <div key={label} className="grid gap-2 py-3 sm:grid-cols-[100px_1fr]"><dt className="text-sm text-text-muted">{label}</dt><dd className="break-words text-sm">{value}</dd></div>)}</dl>{Array.from(selectedCards).map(id => <div key={id} className="border-t border-subtle pt-4"><h2 className="text-sm font-semibold">{allVariations.find(v => v.id === id)?.title}</h2><p className="mt-2 text-sm text-text-muted">{branchAesthetics[id] || 'Liquid Glass'}{customAesthetics[id] && ` · ${customAesthetics[id]}`}</p></div>)}</div>}
              </div>
              <div data-art-exclusion className="flex h-28 shrink-0 flex-col justify-end overflow-y-auto sm:h-16"><SetupActions back={currentStep > 1} blank={currentStep <= 5} disabled={!canContinue} loading={isSubmitting} onBack={goBack} onBlank={skipDirectToStudio} primary={currentStep===7?'Create project':currentStep===4?'Generate story directions':'Continue'}/></div>

            </fieldset></form>
          </main>

        </div>
      </Primitive.Content>
    </Primitive.Portal>
  </Primitive.Root>;
};
