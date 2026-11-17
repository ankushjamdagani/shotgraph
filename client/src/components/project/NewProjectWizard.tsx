import { ReferenceLinks } from '../ui/reference-links';
import { SetupReview } from '../ui/setup-review';
import type { VisualListVariant } from '../ui/visual-choice-list';
import { StoryDeck } from '../ui/story-deck';
import { LookPicker } from '../ui/look-picker';
import { MoodPicker } from '../ui/mood-picker';
import { ProjectTitleField } from '../ui/project-title-field';
import { SetupActions, type SetupActionsVariant } from '../ui/setup-actions';
import { StepIndicator, type StepIndicatorVariant } from '../ui/step-indicator';
import { Dialog as Primitive } from 'radix-ui';
import { Button, IconButton, Textarea, Label } from '../ui';
import { ChoiceGroup } from '../ui/choice-group';
import { AsciiArt } from '../ui/ascii-art';
import { getDefaultStartAppearance } from '../ui/page-background';
import { getPageBackground } from '../ui/page-background';
import { Film } from 'lucide-react';
import { apiFetch } from '../../services/api';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, FolderOpen, Loader2 } from 'lucide-react';
import { cn } from '../ui/cn';
import { FilmProject, ModelEngine } from '../../types';

const VisualListTools = import.meta.env.DEV
  ? React.lazy(() => import('../../dev/VisualListTools'))
  : null;

const DRAFT_STORAGE_KEY = 'shotgraph_create_project_draft_v1';
const AI_CLIENT_CACHE_KEY = 'shotgraph_ai_client_cache_v1';

export type WizardWidth = 'compact' | 'balanced' | 'wide' | 'full';

export const WIZARD_WIDTH_CLASSES: Record<WizardWidth, string> = {
  compact: 'max-w-[832px]',
  balanced: 'max-w-[1024px]',
  wide: 'max-w-[1240px]',
  full: 'max-w-[1440px]',
};

function getCachedAIResponse<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(AI_CLIENT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const entry = parsed[key];
    if (entry && Date.now() - entry.timestamp < 1000 * 60 * 60) {
      return entry.data;
    }
  } catch {}
  return null;
}

function setCachedAIResponse<T>(key: string, data: T) {
  try {
    const raw = sessionStorage.getItem(AI_CLIENT_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[key] = { data, timestamp: Date.now() };
    sessionStorage.setItem(AI_CLIENT_CACHE_KEY, JSON.stringify(parsed));
  } catch {}
}

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
  summary?: string;
  story?: string;
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

const loadSavedDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse saved project draft:', err);
    return null;
  }
};

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  // Restore draft state from localStorage on load
  const initialDraft = useRef(loadSavedDraft()).current;
  const draftActive = useRef(true);

  // Navigation & Variant
  const [visualListVariant, setVisualListVariant] = useState<VisualListVariant>(
    () => initialDraft?.visualListVariant || 'Arched fan',
  );
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (
      initialDraft?.currentStep &&
      typeof initialDraft.currentStep === 'number' &&
      initialDraft.currentStep >= 1 &&
      initialDraft.currentStep <= 7
    ) {
      return initialDraft.currentStep === 2 ? 3 : initialDraft.currentStep;
    }
    return 1;
  });
  const [furthestStep, setFurthestStep] = useState<number>(() => {
    return typeof initialDraft?.furthestStep === 'number'
      ? initialDraft.furthestStep
      : 1;
  });
  const [isExiting, setIsExiting] = useState(false);

  // Step 1: Creative Concept & Location
  const [defaultLocation, setDefaultLocation] = useState<{
    path: string;
    separator: string;
  } | null>(null);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch('/api/projects/default-location', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Location unavailable');
        return response.json();
      })
      .then((data) => {
        if (typeof data.path !== 'string') throw new Error('Location unavailable');
        setDefaultLocation(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLocationError(true);
      });
    return () => controller.abort();
  }, []);

  const [prompt, setPrompt] = useState<string>(() => initialDraft?.prompt || '');
  const [title, setTitle] = useState<string>(() => initialDraft?.title || '');
  const defaultFolderName =
    (title || 'Untitled Video Project')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_') || 'untitled_project';
  const [folderPath, setFolderPath] = useState<string>(
    () => initialDraft?.folderPath || '',
  );
  const displayedLocation =
    folderPath ||
    (defaultLocation
      ? defaultLocation.path + defaultLocation.separator + defaultFolderName
      : locationError
        ? 'Location unavailable — choose a folder'
        : 'Loading save location…');
  const [isPickingDir, setIsPickingDir] = useState(false);

  // Background engine verification
  const [selectedModel] = useState<ModelEngine>(
    () => ['antigravity-cli', 'claude-cli', 'ollama'].includes(initialDraft?.selectedModel) ? initialDraft.selectedModel : 'antigravity-cli',
  );
  const [verifiedModel, setVerifiedModel] = useState<ModelEngine | null>(
    () => null,
  );
  const [engineError, setEngineError] = useState('');
  const engineTest = useRef<AbortController | null>(null);
  useEffect(() => () => engineTest.current?.abort(), []);
  const customDirective = '';

  // Step 3: Format & Specs
  const [selectedAspect, setSelectedAspect] = useState<'9:16' | '16:9' | '1:1'>(
    () => initialDraft?.selectedAspect || '9:16',
  );
  const [selectedDuration, setSelectedDuration] = useState<number>(
    () => initialDraft?.selectedDuration || 30,
  );
  const [customSpecs, setCustomSpecs] = useState<string>(
    () => initialDraft?.customSpecs || '',
  );

  // Step 4: Story Directions & Ambient Loading
  const [isAmbientGenerating, setIsAmbientGenerating] = useState(false);
  const [ambientStatus, setAmbientStatus] = useState('Directing camera optics...');
  const [selectedCards, setSelectedCards] = useState<Set<number>>(() => {
    if (
      Array.isArray(initialDraft?.selectedCards) &&
      initialDraft.selectedCards.length > 0
    ) {
      return new Set(initialDraft.selectedCards);
    }
    return new Set();
  });
  const [customVariations, setCustomVariations] = useState<StoryVariation[]>(
    () => initialDraft?.customVariations || [],
  );
  const [initialVariations, setInitialVariations] = useState<StoryVariation[]>(
    () => initialDraft?.initialVariations || [],
  );
  const [refinePrompt, setRefinePrompt] = useState<string>(
    () => initialDraft?.refinePrompt || '',
  );

  // Step 5: Emotional Mood & Real AI Analysis
  const [selectedMood, setSelectedMood] = useState<string>(
    () => initialDraft?.selectedMood || '',
  );
  const [customMood, setCustomMood] = useState<string>(
    () => initialDraft?.customMood || '',
  );
  const [aiMoods, setAiMoods] = useState<AIMoodOption[]>(
    () => initialDraft?.aiMoods || [],
  );
  const [isAiAnalyzingMood, setIsAiAnalyzingMood] = useState(false);
  const [aiMoodError, setAiMoodError] = useState<string | null>(null);

  // Step 6: Visual Aesthetic
  const [branchAesthetics, setBranchAesthetics] = useState<Record<number, string>>(
    () =>
      initialDraft?.branchAesthetics || {
        1: 'Liquid Glass',
        2: 'Editorial 35mm',
        3: 'Pop Kinetic',
      },
  );
  const [customAesthetics, setCustomAesthetics] = useState<Record<number, string>>(
    () => initialDraft?.customAesthetics || {},
  );

  // Reference URLs per step
  const [stepUrls, setStepUrls] = useState<Record<number, string[]>>(
    () =>
      initialDraft?.stepUrls || {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
      },
  );

  // Form Width state (compact: 832px, balanced: 1024px, wide: 1240px, full: 1440px)
  const [wizardWidth, setWizardWidth] = useState<WizardWidth>('compact');

  const activeWidthClass = WIZARD_WIDTH_CLASSES[wizardWidth];

  // Steps indicator variant state (dots, numbered, segments, pills)
  const [stepIndicatorVariant, setStepIndicatorVariant] = useState<StepIndicatorVariant>('counter');

  const [footerVariant, setFooterVariant] = useState<SetupActionsVariant>('split');
  const [waitingForEngine, setWaitingForEngine] = useState(false);
  const navigationRun = useRef(0);
  const enginePromise = useRef<Promise<boolean> | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Input Refs for Auto-Focus
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const specsInputRef = useRef<HTMLTextAreaElement | null>(null);
  const moodInputRef = useRef<HTMLTextAreaElement | null>(null);
  const aestheticInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);

  const generation = useRef<AbortController | null>(null);
  const moodGeneration = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      generation.current?.abort();
      moodGeneration.current?.abort();
    },
    [],
  );

  const allVariations = [...initialVariations, ...customVariations];

  // Persist while editing; closing must not let late responses recreate the draft.
  useEffect(() => {
    if (!draftActive.current) return;
    try {
      const draft = {
        currentStep,
        furthestStep,
        title,
        prompt,
        folderPath,
        selectedAspect,
        selectedDuration,
        customSpecs,
        selectedModel,
        verifiedModel,
        selectedCards: Array.from(selectedCards),
        customVariations,
        initialVariations,
        selectedMood,
        customMood,
        aiMoods,
        branchAesthetics,
        customAesthetics,
        stepUrls,
        visualListVariant,
        refinePrompt,
        wizardWidth,
        updatedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    currentStep,
    furthestStep,
    title,
    prompt,
    folderPath,
    selectedAspect,
    selectedDuration,
    customSpecs,
    selectedModel,
    verifiedModel,
    selectedCards,
    customVariations,
    initialVariations,
    selectedMood,
    customMood,
    aiMoods,
    branchAesthetics,
    customAesthetics,
    stepUrls,
    visualListVariant,
    refinePrompt,
    wizardWidth,
  ]);

  const closeAndDiscard = () => {
    if (isSubmitting) return;
    draftActive.current = false;
    ++navigationRun.current;
    generation.current?.abort();
    moodGeneration.current?.abort();
    engineTest.current?.abort();
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
    try { sessionStorage.removeItem(AI_CLIENT_CACHE_KEY); } catch {}
    onClose();
  };

  // Clear/Reset draft helper
  const handleResetDraft = useCallback(() => {
    ++navigationRun.current;
    setWaitingForEngine(false);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setCurrentStep(1);
    setFurthestStep(1);
    setTitle('');
    setPrompt('');
    setFolderPath('');
    setSelectedAspect('9:16');
    setSelectedDuration(30);
    setCustomSpecs('');
    generation.current?.abort();
    moodGeneration.current?.abort();
    setIsAmbientGenerating(false);
    setIsAiAnalyzingMood(false);
    setSelectedCards(new Set());
    setCustomVariations([]);
    setInitialVariations([]);
    setSelectedMood('');
    setCustomMood('');
    setAiMoods([]);
    setBranchAesthetics({ 1: 'Liquid Glass', 2: 'Editorial 35mm', 3: 'Pop Kinetic' });
    setCustomAesthetics({});
    setStepUrls({ 1: [], 2: [], 3: [], 4: [], 5: [] });
    setRefinePrompt('');
    setErrorMsg('');
  }, []);

  // Helper: Extract URLs from text
  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex) || [];
    return [...new Set(matches.map(url => url.replace(/[.,;!?)\]]+$/, '')))].filter(url => {
      try { return !!new URL(url).hostname; } catch { return false; }
    });
  };

  const handleTextChangeWithUrlExtraction = (
    stepNum: number,
    text: string,
    setText: (s: string) => void,
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
      else if (currentStep === 3) specsInputRef.current?.focus();
      else if (currentStep === 5) moodInputRef.current?.focus();
      else if (currentStep === 2)
        dialogRef.current?.querySelector<HTMLElement>('[role="radio"]')?.focus();
      else if (currentStep === 6) aestheticInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep, isOpen]);

  // Real AI Mood Call with caching
  const triggerAiMoodAnalysis = async (
    premisePrompt: string,
    engineOverride?: ModelEngine,
  ) => {
    const engine = engineOverride || selectedModel;
    if (verifiedModel !== engine && !engineOverride) return;
    const textToAnalyze = premisePrompt.trim() || 'A high-impact cinematic film concept';

    const cacheKey = `mood:${engine}:${textToAnalyze.toLowerCase()}`;
    const cached = getCachedAIResponse<AIMoodOption[]>(cacheKey);
    if (cached && cached.length > 0) {
      setAiMoods(cached);
      return;
    }

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
          modelEngine: engine,
        }),
      });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (res.ok && data.success && Array.isArray(data.moods) && data.moods.length > 0) {
        setAiMoods(data.moods);
        setCachedAIResponse(cacheKey, data.moods);
      } else {
        setAiMoodError(data.error || 'Failed to extract mood with AI runner.');
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setAiMoodError(err.message || 'Network error connecting to AI runner.');
    } finally {
      if (!controller.signal.aborted) setIsAiAnalyzingMood(false);
    }
  };

  // Skip direct to studio
  const skipDirectToStudio = () => {
    handleStartProduction(true);
  };

  // Fetch story directions for the current brief and format
  const fetchStoryDirections = useCallback(
    async (
      isUserExplicit = false,
      engineOverride?: ModelEngine,
    ): Promise<StoryVariation[]> => {
      const engine = engineOverride || selectedModel;
      const textBrief = prompt.trim() || title.trim() || 'A cinematic film concept';
      const cacheKey = `story:${engine}:${selectedDuration}:${textBrief.toLowerCase()}:${(customMood || selectedMood || '').toLowerCase()}`;

      const cached = getCachedAIResponse<StoryVariation[]>(cacheKey);
      if (cached && cached.length > 0) {
        setInitialVariations(cached);
        setSelectedCards((prev) => (prev.size === 0 ? new Set([cached[0].id]) : prev));
        if (isUserExplicit) setIsAmbientGenerating(false);
        return cached;
      }

      if (isUserExplicit) {
        setIsAmbientGenerating(true);
        setAmbientStatus('Generating story directions…');
      }
      setErrorMsg('');
      generation.current?.abort();
      const controller = new AbortController();
      generation.current = controller;

      const promise = (async () => {
        try {
          const response = await apiFetch('/api/ai/story-directions', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: textBrief,
              duration: selectedDuration,
              modelEngine: engine,
              mood: customMood || selectedMood,
              directive: customDirective,
            }),
          });
          const data = await response.json();
          if (controller.signal.aborted) throw new Error('Generation canceled.');
          if (
            !response.ok ||
            !Array.isArray(data.directions) ||
            !data.directions.length
          ) {
            throw new Error(
              data.error ||
                'No story directions returned. Try again or create a blank project.',
            );
          }
          const directions: StoryVariation[] = data.directions.map(
            (item: any, index: number) => ({
              ...item,
              id: index + 1,
              summary:
                item.summary ||
                item.beats?.[0]?.text?.slice(0, 120) ||
                'A cinematic narrative journey.',
              story:
                item.story ||
                item.beats?.map((b: any) => `${b.label}: ${b.text}`).join('\n\n') ||
                '',
              durationLabel: `${selectedDuration}s • ${item.beats?.length || 3} beats`,
              audioFreq: 0,
              audioType: 'sine',
            }),
          );
          setInitialVariations(directions);
          setCachedAIResponse(cacheKey, directions);
          setSelectedCards((prev) => (prev.size === 0 ? new Set([directions[0].id]) : prev));
          return directions;
        } catch (error: any) {
          if (!controller.signal.aborted && isUserExplicit) {
            setErrorMsg(error.message);
          }
          throw error;
        } finally {
          if (!controller.signal.aborted && isUserExplicit) {
            setIsAmbientGenerating(false);
          }
        }
      })();

      return promise;
    },
    [prompt, title, selectedDuration, selectedModel, customMood, selectedMood, customDirective],
  );

  // Ambient breathing generation
  const triggerAmbientGeneration = async () => {
    const run = ++navigationRun.current;
    setWaitingForEngine(true);
    const ready = await enginePromise.current;
    if (run !== navigationRun.current) return;
    setWaitingForEngine(false);
    if (!ready) return;
    advanceToStep(4);
    setIsAmbientGenerating(true);
    try { await fetchStoryDirections(true); }
    catch (error) { if (run === navigationRun.current) setErrorMsg((error as Error).message); }
    finally { if (run === navigationRun.current) setIsAmbientGenerating(false); }
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
      title:
        refinePrompt.slice(0, 32) + (refinePrompt.length > 32 ? '…' : ''),
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

  const handlePickDirectory = async () => {
    setIsPickingDir(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/projects/pick-directory', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Folder picker unavailable');
      if (data.path) {
        setFolderPath(data.path);
      }
    } catch {
      setErrorMsg(
        'Could not open the folder picker. Enter a location manually or try again.',
      );
    } finally {
      setIsPickingDir(false);
    }
  };

  const advanceToStep = (step: number) => {
    setCurrentStep(step);
    setFurthestStep((previous) => Math.max(previous, step));
    setErrorMsg('');
    dialogRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const goBack = () => {
    ++navigationRun.current;
    setWaitingForEngine(false);
    if (currentStep > 1) {
      setCurrentStep(currentStep === 3 ? 1 : currentStep - 1);
      dialogRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleStartProduction = async (emptyDAG = false) => {
    if (isSubmitting) return;
    ++navigationRun.current;
    setWaitingForEngine(false);
    generation.current?.abort();
    setIsSubmitting(true);
    setErrorMsg('');
    const projectName = title.trim() || 'Untitled Video Project';
    const primaryAesthetic =
      branchAesthetics[Array.from(selectedCards)[0]] || 'Liquid Glass';
    const presetMap: Record<string, string> = {
      'Liquid Glass': 'liquid_glass',
      'Editorial 35mm': 'editorial_grain',
      'Pop Kinetic': 'kinetic_type',
      'Cyber Noir': 'liquid_glass',
    };

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
        // Clear saved draft since project was successfully created
        draftActive.current = false;
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}

        setIsExiting(true);
        setTimeout(() => {
          onProjectCreated(data.project);
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

  const testEngine = async () => {
    engineTest.current?.abort();
    const controller = new AbortController();
    engineTest.current = controller;
    setVerifiedModel(null);
    setEngineError('');
    try {
      const response = await apiFetch('/api/ai/test-connection', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelEngine: selectedModel }),
      });
      const data = await response.json();
      if (controller.signal.aborted) return false;
      if (!response.ok || !data.success || data.engine !== selectedModel)
        throw new Error(data.error || 'Connection test failed.');
      setVerifiedModel(selectedModel);
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setEngineError((error as Error).message);
      return false;
    }
  };

  const moodContext = [
    prompt,
    ...allVariations
      .filter((item) => selectedCards.has(item.id))
      .map((item) => item.title + ': ' + item.beats.map((beat) => beat.text).join(' ')),
  ]
    .filter(Boolean)
    .join('\n');

  const visibleSteps = [1, 3, 4, 5, 6, 7];
  const stepNames = ['Brief', 'Format', 'Story', 'Mood', 'Look', 'Review'];
  const headings = [
    'Start with an idea.',
    'Choose your creative engine.',
    'Give your film a format.',
    'Find your story direction.',
    'Set the mood.',
    'Define the visual language.',
    'Ready for the studio.',
  ];
  const descriptions = [
    'Describe what you want to make. The details can follow.',
    'Test your selected engine before using AI assistance.',
    'Choose a canvas and target length.',
    'Select one or more directions, or write your own.',
    'Choose a mood for the selected story direction.',
    'Choose a look for each selected story direction.',
    'Review your setup before creating the project.',
  ];

  const canContinue =
    !isSubmitting &&
    !isAmbientGenerating &&
    !waitingForEngine &&
    (currentStep !== 4 || allVariations.some((v) => selectedCards.has(v.id)));

  const next = () => {
    if (!canContinue) return;
    setErrorMsg('');
    if (currentStep === 1) advanceToStep(3);
    else if (currentStep === 3) void triggerAmbientGeneration();
    else if (currentStep === 4) {
      if (moodContext.trim()) void triggerAiMoodAnalysis(moodContext);
      advanceToStep(5);
    } else if (currentStep === 7) void handleStartProduction();
    else advanceToStep(currentStep + 1);
  };

  const hasDraftContent = Boolean(
    title.trim() || prompt.trim() || currentStep > 1 || selectedMood,
  );

  useEffect(() => {
    enginePromise.current = testEngine();
  }, []);

  return (
    <Primitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          closeAndDiscard();
        }
      }}
    >
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-50 bg-app" />
        <Primitive.Content
          aria-describedby="create-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            promptInputRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (isSubmitting) event.preventDefault();
          }}
          className={`fixed inset-0 z-50 isolate flex flex-col overflow-hidden text-text-primary outline-none transition-opacity duration-normal motion-reduce:transition-none ${
            isExiting ? 'pointer-events-none opacity-0' : ''
          }`}
          style={getPageBackground()}
        >
          <AsciiArt appearance={getDefaultStartAppearance()} exclusionStyle="soft" />

          {/* Top Header */}
          <header className="shrink-0 px-4 sm:px-8">
            <div
              data-art-exclusion
              className={cn(
                'mx-auto flex h-16 w-full items-center justify-between gap-4 px-2 sm:px-4 transition-[max-width] duration-300',
                activeWidthClass,
              )}
            >
              <div className="flex items-center gap-3">
                <Film className="size-5" />
                <span className="text-sm font-semibold tracking-tight">Shotgraph</span>
                <span className="rounded bg-card/60 px-2 py-0.5 text-[10px] font-mono uppercase text-text-muted border border-subtle">
                  Genesis
                </span>
              </div>

              <div className="flex items-center gap-2">
                <IconButton
                  label="Close create project"
                  disabled={isSubmitting}
                  onClick={closeAndDiscard}
                >
                  <X />
                </IconButton>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex min-h-0 flex-1 flex-col">
            <main className="flex min-h-0 flex-1 flex-col justify-center px-2 py-3 sm:px-6 sm:py-6">
              {/* Form container dynamically adjusts with wizard width controls and stays constant across all steps */}
              <form
                className={cn(
                  'mx-auto flex min-h-0 w-full flex-1 flex-col px-2 sm:max-h-[840px] sm:px-4 transition-[max-width] duration-300',
                  activeWidthClass,
                )}
                onSubmit={(event) => {
                  event.preventDefault();
                  next();
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault();
                    next();
                  }
                }}
              >
                <fieldset
                  disabled={isSubmitting}
                  className="flex min-h-0 min-w-0 flex-1 flex-col border-0 p-0"
                >
                  {/* Fixed Step Title & Description Header (Never scrolls away) */}
                  <div
                    data-art-exclusion
                    className="w-full mx-auto px-2 sm:px-4 pb-3 pt-1 shrink-0 space-y-1.5 select-none"
                  >
                    <Primitive.Title className="text-2xl sm:text-3xl font-semibold tracking-tight">
                      {headings[currentStep - 1]}
                    </Primitive.Title>
                    <Primitive.Description
                      id="create-description"
                      className={
                        currentStep === 1 || currentStep === 3
                          ? 'sr-only'
                          : 'text-xs sm:text-sm leading-relaxed text-text-muted'
                      }
                    >
                      {descriptions[currentStep - 1]}
                    </Primitive.Description>
                  </div>

                  {waitingForEngine && <p role="status" className="flex items-center gap-2 px-4 py-3 text-sm text-text-muted"><Loader2 className="size-4 animate-spin" />Checking the creative engine…</p>}
                  {engineError && currentStep >= 3 && <div role="alert" className="px-4 py-3 text-sm text-danger">{engineError}<Button variant="quiet" onClick={() => { enginePromise.current = testEngine(); }}>Retry connection</Button></div>}
                  {/* Error Alert Box */}
                  {errorMsg && (
                    <div
                      role="alert"
                      className="w-full mx-auto px-2 sm:px-4 pb-2 shrink-0"
                    >
                      <div className="rounded-md border border-danger p-3 break-words text-xs sm:text-sm text-danger">
                        {errorMsg}
                        {currentStep === 4 && (
                          <Button
                            variant="ghost"
                            onClick={triggerAmbientGeneration}
                            className="mt-2 text-xs"
                          >
                            Retry generation
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Scrollable Stage Area (Only the step content scrolls) */}
                  <div
                    ref={dialogRef}
                    className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-1 pb-5 pt-2 [scrollbar-gutter:stable_both-edges]"
                  >
                    {/* Step 1: Brief & Location */}
                    {currentStep === 1 && (
                      <div
                        data-art-exclusion
                        className="w-full mx-auto px-2 sm:px-4 space-y-6"
                      >
                        <div>
                          <ProjectTitleField value={title} onChange={setTitle} />
                        </div>
                        <div className="space-y-4">
                          <Label
                            htmlFor="project-idea"
                            className="block text-xs text-text-muted"
                          >
                            Description
                          </Label>
                          <Textarea
                            variant="plain"
                            id="project-idea"
                            ref={promptInputRef}
                            rows={5}
                            className="min-h-48 text-xl leading-relaxed sm:min-h-56 sm:text-2xl"
                            value={prompt}
                            onChange={(e) =>
                              handleTextChangeWithUrlExtraction(
                                1,
                                e.target.value,
                                setPrompt,
                              )
                            }
                            placeholder="A story, a scene, a character. What do you have in mind?"
                            aria-describedby="idea-help"
                          />
                          <p id="idea-help" className="text-xs text-text-muted">
                            Include reference links, or start with just a thought.
                          </p>
                        </div>
                        <ReferenceLinks urls={stepUrls[1] || []} onRemove={(url) => removeUrl(1, url)} />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                          <FolderOpen className="size-4 shrink-0 text-text-muted" />
                          <span className="text-text-muted">Save to</span>
                          <span
                            className="min-w-0 max-w-full break-all sm:max-w-lg"
                            title={displayedLocation}
                          >
                            {displayedLocation}
                          </span>
                          <Button
                            variant="soft"
                            size="sm"
                            loading={isPickingDir}
                            onClick={handlePickDirectory}
                          >
                            Change folder
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Format & Specs */}
                    {currentStep === 3 && (
                      <div
                        data-art-exclusion
                        className="w-full mx-auto px-2 sm:px-4 space-y-7"
                      >
                        <section className="space-y-3">
                          <h2 className="text-sm font-medium">Aspect ratio</h2>
                          <ChoiceGroup
                            label="Aspect ratio"
                            value={selectedAspect}
                            onChange={(v) => setSelectedAspect(v as typeof selectedAspect)}
                            options={[
                              {
                                value: '9:16',
                                label: 'Portrait · 9:16',
                                description: '1080 × 1920',
                              },
                              {
                                value: '16:9',
                                label: 'Landscape · 16:9',
                                description: '1920 × 1080',
                              },
                              {
                                value: '1:1',
                                label: 'Square · 1:1',
                                description: '1080 × 1080',
                              },
                            ]}
                          />
                        </section>
                        <section className="space-y-3">
                          <h2 className="text-sm font-medium">Target duration</h2>
                          <ChoiceGroup
                            label="Target duration"
                            value={String(selectedDuration)}
                            onChange={(v) => setSelectedDuration(Number(v))}
                            options={[15, 30, 60].map((n) => ({
                              value: String(n),
                              label: `${n} seconds`,
                            }))}
                          />
                        </section>
                        <div className="space-y-2">
                          <Label htmlFor="project-specs">
                            Creative notes{' '}
                            <span className="font-normal text-text-muted">
                              (optional)
                            </span>
                          </Label>
                          <Textarea
                            variant="plain"
                            id="project-specs"
                            ref={specsInputRef}
                            value={customSpecs}
                            onChange={(e) =>
                              handleTextChangeWithUrlExtraction(
                                2,
                                e.target.value,
                                setCustomSpecs,
                              )
                            }
                            rows={3}
                            placeholder="For example: a slow opening, quick cuts at the end, or a reference film to follow."
                            aria-describedby="format-notes-help"
                          />
                          <ReferenceLinks urls={stepUrls[2] || []} onRemove={(url) => removeUrl(2, url)} />
                          <p id="format-notes-help" className="text-xs text-text-muted">
                            These notes guide the story. Canvas and duration use the
                            choices above.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Story Directions */}
                    {currentStep === 4 && (
                      <div data-art-exclusion className="space-y-6">
                        {isAmbientGenerating ? (
                          <div
                            role="status"
                            className="flex min-h-[360px] sm:min-h-[420px] flex-col items-center justify-center text-center w-full mx-auto px-4 space-y-4 animate-in fade-in duration-300"
                          >
                            <div className="flex size-14 items-center justify-center rounded-2xl bg-card border border-subtle shadow-md">
                              <Loader2 className="size-7 animate-spin text-accent-primary" />
                            </div>
                            <div className="space-y-1.5 max-w-sm">
                              <p className="text-base font-semibold text-text-primary">{ambientStatus}</p>
                              <p className="text-xs text-text-muted leading-relaxed">
                                Weaving narrative beats, cinematic treatments, and character hooks.
                              </p>
                              <p className="text-[11px] text-text-muted/60 pt-1">
                                You can create a blank project anytime while the engine is working.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full mx-auto px-2">
                            <StoryDeck
                              directions={allVariations}
                              selected={selectedCards}
                              onToggle={toggleCardPick}
                              variant={visualListVariant}
                              customPrompt={refinePrompt}
                              onCustomPromptChange={(val) =>
                                handleTextChangeWithUrlExtraction(
                                  5,
                                  val,
                                  setRefinePrompt,
                                )
                              }
                              onAddCustomDirection={addCustomVariation}
                            />
                            <ReferenceLinks urls={stepUrls[5] || []} onRemove={(url) => removeUrl(5, url)} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 5: Mood - Cards carousel is the main focus, with AI suggestion and custom prompt integrated as cards */}
                    {currentStep === 5 && (
                      <div data-art-exclusion className="space-y-6">
                        <div className="w-full mx-auto px-2">
                          <MoodPicker
                            variant={visualListVariant}
                            value={selectedMood}
                            customMood={customMood}
                            onChange={(selectedTitle) => {
                              setSelectedMood(selectedTitle);
                            }}
                            onCustomMoodChange={(val) =>
                              handleTextChangeWithUrlExtraction(3, val, setCustomMood)
                            }
                            suggestion={
                              aiMoods.find((mood) => mood.isRecommended) || aiMoods[0]
                            }
                            loading={isAiAnalyzingMood}
                            error={!!aiMoodError}
                            hasIdea={!!moodContext.trim()}
                            onRetry={() => triggerAiMoodAnalysis(moodContext)}
                          />
                          <ReferenceLinks urls={stepUrls[3] || []} onRemove={(url) => removeUrl(3, url)} />
                        </div>
                      </div>
                    )}

                    {/* Step 6: Visual Looks - Cards carousel is the main focus, with custom look integrated as card */}
                    {currentStep === 6 && (
                      <div data-art-exclusion className="space-y-8">
                        {Array.from(selectedCards).map((id, index) => (
                          <section key={id} className="space-y-4">
                            {/* Heading */}
                            <div className="w-full mx-auto px-2 sm:px-4">
                              <h2 className="text-sm font-semibold">
                                {allVariations.find((v) => v.id === id)?.title ||
                                  `Direction ${index + 1}`}
                              </h2>
                            </div>

                            {/* Cards Visual List */}
                            <div className="w-full mx-auto px-2">
                              <LookPicker
                                variant={visualListVariant}
                                label={`Look for direction ${index + 1}`}
                                value={branchAesthetics[id] || 'Liquid Glass'}
                                customLook={customAesthetics[id] || ''}
                                onChange={(value) =>
                                  setBranchAesthetics((prev) => ({
                                    ...prev,
                                    [id]: value,
                                  }))
                                }
                                onCustomLookChange={(val) =>
                                  setCustomAesthetics((prev) => ({
                                    ...prev,
                                    [id]: val,
                                  }))
                                }
                              />
                            </div>
                          </section>
                        ))}
                      </div>
                    )}

                    {/* Step 7: Review */}
                    {currentStep === 7 && (
                      <div
                        data-art-exclusion
                        className="w-full mx-auto px-2 sm:px-4"
                      >
                        <SetupReview
                          name={title.trim() || 'Untitled Video Project'}
                          location={displayedLocation}
                          format={`${selectedAspect} · ${selectedDuration} seconds`}
                          engine={selectedModel}
                          mood={selectedMood || (customMood.trim() ? 'Custom mood' : '')}
                          moodNotes={customMood}
                          directions={Array.from(selectedCards).map((id) => ({
                            id,
                            title:
                              allVariations.find((item) => item.id === id)?.title ||
                              `Direction ${id}`,
                            look: branchAesthetics[id] || 'Liquid Glass',
                            customLook: customAesthetics[id] || '',
                          }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions with Step Dots */}
                  <div
                    data-art-exclusion
                    className="w-full mx-auto px-2 sm:px-4 shrink-0 pt-3"
                  >
                    <SetupActions
                      back={currentStep > 1}
                      blank={true}
                      variant={footerVariant}
                      onReset={hasDraftContent ? handleResetDraft : undefined}
                      disabled={!canContinue}
                      loading={isSubmitting}
                      onBack={goBack}
                      onBlank={skipDirectToStudio}
                      middle={
                        <StepIndicator
                          steps={stepNames}
                          currentStep={visibleSteps.indexOf(currentStep) + 1}
                          furthestStep={visibleSteps.filter((step) => step <= furthestStep).length}
                          variant={stepIndicatorVariant}
                          disabled={isSubmitting || isAmbientGenerating || waitingForEngine}
                          onStepClick={(step) => advanceToStep(visibleSteps[step - 1])}
                        />
                      }
                      primary={
                        currentStep === 7
                          ? 'Create project'
                          : currentStep === 3
                            ? 'Generate story directions'
                            : 'Continue'
                      }
                    />
                  </div>
                </fieldset>
              </form>
            </main>
          </div>

          {VisualListTools && (
            <React.Suspense fallback={null}>
              <VisualListTools
                onChange={setVisualListVariant}
                onVariantChange={setVisualListVariant}
                onWidthChange={setWizardWidth}
                onStepIndicatorChange={setStepIndicatorVariant}
                onFooterChange={setFooterVariant}
                initialVariant={visualListVariant}
                initialWidth={wizardWidth}
                initialStepIndicator={stepIndicatorVariant}
              />
            </React.Suspense>
          )}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
};
