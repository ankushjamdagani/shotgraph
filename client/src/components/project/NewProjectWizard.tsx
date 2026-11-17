import { ProjectIdeaInput, type ProjectIdeaInputVariant } from '../ui/project-idea-input';
import { EmptyProjectAction } from '../ui/empty-project-action';
import { setupDefaults } from '../ui/setup-defaults';
import { toast } from '../../services/toastService';
import { SetupFlow, isSideSetupFlow, isSplitSetupFlow, type SetupFlowVariant } from '../ui/setup-flow';
import type { StoryConcept, StoryContentVariant } from '../ui/story-content';
import { SetupHeader, type SetupHeaderVariant } from '../ui/setup-header';
import { Input, SetupInputContext, type SetupInputVariant } from '../ui/input';
import { ReferenceLinks } from '../ui/reference-links';
import { SetupReview } from '../ui/setup-review';
import type { VisualListVariant } from '../ui/visual-choice-list';
import { StoryDeck, type StoryPresentationVariant } from '../ui/story-deck';
import { LookPicker } from '../ui/look-picker';
import { MoodPicker } from '../ui/mood-picker';
import { ProjectTitleField } from '../ui/project-title-field';
import { SetupActions, type SetupActionsVariant } from '../ui/setup-actions';
import { StepIndicator, type StepIndicatorVariant } from '../ui/step-indicator';
import { Dialog as Primitive } from 'radix-ui';
import { Button, Label } from '../ui';
import { ProjectSettingsFields } from '../ui/project-settings-fields';
import { AsciiArt } from '../ui/ascii-art';
import { getDefaultStartAppearance } from '../ui/page-background';
import { getPageBackground } from '../ui/page-background';
import { apiFetch } from '../../services/api';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
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

interface StoryVariation extends StoryConcept {
  id: number;
  title: string;
  summary?: string;
  story?: string;
  durationLabel: string;
  beats: StoryBeat[];
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
    setupDefaults.cardLayout,
  );
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (
      initialDraft?.currentStep &&
      typeof initialDraft.currentStep === 'number' &&
      initialDraft.currentStep >= 1 &&
      initialDraft.currentStep <= 7
    ) {
      return [2, 3].includes(initialDraft.currentStep) ? 1 : initialDraft.currentStep;
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
  const [titleEdited, setTitleEdited] = useState<boolean>(() => initialDraft?.titleEdited ?? Boolean(initialDraft?.title));
  const [folderPath, setFolderPath] = useState<string>(() => initialDraft?.folderPath || '');
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
      return new Set<number>(initialDraft.selectedCards.slice(0, 1));
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
  const [wizardWidth, setWizardWidth] = useState<WizardWidth>(setupDefaults.formWidth);

  const activeWidthClass = WIZARD_WIDTH_CLASSES[wizardWidth];

  // Steps indicator variant state (dots, numbered, segments, pills)
  const [stepIndicatorVariant, setStepIndicatorVariant] = useState<StepIndicatorVariant>(setupDefaults.stepIndicator);

  const [storyContent, setStoryContent] = useState<StoryContentVariant>(setupDefaults.storyContent);
  const [storyPresentation, setStoryPresentation] = useState<StoryPresentationVariant>(setupDefaults.storyPresentation);
  const [headerVariant, setHeaderVariant] = useState<SetupHeaderVariant>(setupDefaults.headerLayout);
  const [inputVariant, setInputVariant] = useState<SetupInputVariant>(setupDefaults.inputStyle);
  const [ideaInputVariant, setIdeaInputVariant] = useState<ProjectIdeaInputVariant>(setupDefaults.ideaInput);
  const [flowVariant, setFlowVariant] = useState<SetupFlowVariant>(setupDefaults.flowLayout);
  const [footerVariant, setFooterVariant] = useState<SetupActionsVariant>(setupDefaults.footerLayout);
  const [waitingForEngine, setWaitingForEngine] = useState(false);
  const navigationRun = useRef(0);
  const enginePromise = useRef<Promise<boolean> | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Input Refs for Auto-Focus
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
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
  const chosenStory = allVariations.find(item => selectedCards.has(item.id));
  const chosenStoryIds = chosenStory ? [chosenStory.id] : [];
  const projectTitle = titleEdited ? title : chosenStory?.title || '';
  const defaultFolderName = (projectTitle.trim() || 'Untitled Video Project').toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'untitled_project';
  const displayedLocation = folderPath.trim() || (defaultLocation
    ? defaultLocation.path + defaultLocation.separator + defaultFolderName
    : locationError ? 'Location unavailable — choose a folder' : 'Loading save location…');


  // Persist while editing; closing must not let late responses recreate the draft.
  useEffect(() => {
    if (!draftActive.current) return;
    try {
      const draft = {
        currentStep,
        furthestStep,
        title,
        titleEdited,
        prompt,
        folderPath,
        selectedAspect,
        selectedDuration,
        customSpecs,
        selectedModel,
        selectedCards: Array.from(selectedCards),
        customVariations,
        initialVariations,
        selectedMood,
        customMood,
        aiMoods,
        branchAesthetics,
        customAesthetics,
        stepUrls,
        refinePrompt,
        updatedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    currentStep,
    furthestStep,
    title,
    titleEdited,
    prompt,
    folderPath,
    selectedAspect,
    selectedDuration,
    customSpecs,
    selectedModel,
    selectedCards,
    customVariations,
    initialVariations,
    selectedMood,
    customMood,
    aiMoods,
    branchAesthetics,
    customAesthetics,
    stepUrls,
    refinePrompt,
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
        errorToast: false,
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
      const cacheKey = `story-concept-v3:${engine}:${selectedDuration}:${textBrief.toLowerCase()}:${(customMood || selectedMood || '').toLowerCase()}`;

      const cached = getCachedAIResponse<StoryVariation[]>(cacheKey);
      if (cached && cached.length > 0) {
        setInitialVariations(cached);
        setSelectedCards((prev) => new Set([cached.find(item => prev.has(item.id))?.id ?? cached[0].id]));
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
        errorToast: false,
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
                item.beats?.map((b: any) => b.text).join(' ') ||
                '',
              durationLabel: 'Story concept',
              beats: [],
            }),
          );
          setInitialVariations(directions);
          setCachedAIResponse(cacheKey, directions);
          setSelectedCards((prev) => new Set([directions.find(item => prev.has(item.id))?.id ?? directions[0].id]));
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
    setSelectedCards(new Set([id]));
  };

  const addCustomVariation = () => {
    if (!refinePrompt.trim()) return;
    const newId = 100 + customVariations.length + 1;
    const newVar: StoryVariation = {
      id: newId,
      title:
        refinePrompt.slice(0, 32) + (refinePrompt.length > 32 ? '…' : ''),
      durationLabel: 'Your story',
      story: refinePrompt.trim(),
      summary: refinePrompt.trim().slice(0, 120),
      beats: [],
    };
    setCustomVariations((prev) => [...prev, newVar]);
    setSelectedCards(new Set([newId]));
    setBranchAesthetics((prev) => ({ ...prev, [newId]: 'Liquid Glass' }));
    setRefinePrompt('');
  };

  const handlePickDirectory = async () => {
    setIsPickingDir(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/projects/pick-directory', {
        errorToast: false,
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Folder picker unavailable');
      if (data.path) {
        setFolderPath(data.path);
      }
    } catch {
      toast.error(
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
      setCurrentStep(currentStep === 4 ? 1 : currentStep - 1);
      dialogRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleStartProduction = async (emptyDAG = false) => {
    if (isSubmitting) return;
    if (!emptyDAG && !chosenStory) {
      setCurrentStep(4);
      setErrorMsg('Choose one story direction before creating your project.');
      return;
    }
    ++navigationRun.current;
    setWaitingForEngine(false);
    generation.current?.abort();
    setIsSubmitting(true);
    setErrorMsg('');
    const projectName = projectTitle.trim() || chosenStory?.title || 'Untitled Video Project';
    const primaryAesthetic =
      branchAesthetics[chosenStory?.id ?? 0] || 'Liquid Glass';
    const presetMap: Record<string, string> = {
      'Liquid Glass': 'liquid_glass',
      'Editorial 35mm': 'editorial_grain',
      'Pop Kinetic': 'kinetic_type',
      'Cyber Noir': 'liquid_glass',
    };

    const branchesData = chosenStoryIds.map((cardId) => {
      const v = allVariations.find((item) => item.id === cardId);
      return {
        id: cardId,
        title: v?.title || `Track #${cardId}`,
        aesthetic: branchAesthetics[cardId] || 'Liquid Glass',
        customLook: branchAesthetics[cardId] === 'Custom look' ? customAesthetics[cardId] || '' : '',
        summary: v?.summary || '',
        story: v?.story || v?.summary || '',
      };
    });
    const allUrls = Object.values(stepUrls).flat();

    try {
      const res = await apiFetch('/api/projects/create', {
        errorToast: false,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          path: folderPath.trim() || undefined,
          aspectRatio: selectedAspect,
          targetDurationSec: selectedDuration,
          basePresetId: presetMap[primaryAesthetic] || 'liquid_glass',
          ideaPrompt: prompt.trim() || projectName,
          emptyDAG,
          genesisConfig: {
            mood: selectedMood,
            customMood: selectedMood === 'Custom prompt' ? customMood : '',
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
        toast.error(data.error || 'Failed to create project.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Server connection error.');
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
        errorToast: false,
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
      .map((item) => item.title + ': ' + (item.story || item.summary || '')),
  ]
    .filter(Boolean)
    .join('\n');

  const visibleSteps = [1, 4, 5, 6, 7];
  const stepNames = ['Brief', 'Story', 'Mood', 'Look', 'Review'];
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
    'Choose one direction, or write your own.',
    'Choose a mood for the selected story direction.',
    'Choose a look for your story.',
    'Review your setup before creating the project.',
  ];

  const canContinue =
    !isSubmitting &&
    !isAmbientGenerating &&
    !waitingForEngine &&
    (currentStep < 4 || Boolean(chosenStory));

  const next = () => {
    if (!canContinue) return;
    setErrorMsg('');
    if (currentStep === 1) void triggerAmbientGeneration();
    else if (currentStep === 4) {
      if (moodContext.trim()) void triggerAiMoodAnalysis(moodContext);
      advanceToStep(5);
    } else if (currentStep === 7) void handleStartProduction();
    else advanceToStep(currentStep + 1);
  };

  useEffect(() => {
    enginePromise.current = testEngine();
  }, []);

  const stepIntroduction = (
    <div data-art-exclusion className={cn('mx-auto w-full shrink-0 space-y-1.5 px-2 pb-3 pt-1 sm:px-4', activeWidthClass, flowVariant === 'Quiet focus' && 'text-center')}>
      <Primitive.Title className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {headings[currentStep - 1]}
      </Primitive.Title>
      <Primitive.Description id="create-description" className={currentStep === 1 ? 'sr-only' : 'text-xs leading-relaxed text-text-muted sm:text-sm'}>
        {descriptions[currentStep - 1]}
      </Primitive.Description>
    </div>
  );

  return (
    <SetupInputContext.Provider value={inputVariant}><Primitive.Root
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
          className={`fixed inset-0 z-50 isolate flex flex-col overflow-clip text-text-primary outline-none transition-opacity duration-normal motion-reduce:transition-none ${
            isExiting ? 'pointer-events-none opacity-0' : ''
          }`}
          style={getPageBackground()}
        >

          <form className="flex min-h-0 flex-1 flex-col"
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
                <SetupFlow
                  variant={flowVariant}
                  background={<AsciiArt appearance={getDefaultStartAppearance()} exclusionStyle="soft" />}
                  columnClassName={activeWidthClass}
                  disabled={isSubmitting}
                  header={<SetupHeader showProjectLabel={flowVariant !== 'Quiet focus'} variant={headerVariant} step={stepNames[visibleSteps.indexOf(currentStep)]} position={visibleSteps.indexOf(currentStep) + 1} total={visibleSteps.length} disabled={isSubmitting} onClose={closeAndDiscard} className={['Original', 'Aligned bands', 'Quiet focus'].includes(flowVariant) ? activeWidthClass : undefined}/>}
                  progress={<StepIndicator steps={stepNames} currentStep={visibleSteps.indexOf(currentStep) + 1} furthestStep={visibleSteps.filter(step => step <= furthestStep).length} variant={isSideSetupFlow(flowVariant) ? 'chapters' : stepIndicatorVariant} disabled={isSubmitting || isAmbientGenerating || waitingForEngine} onStepClick={step => advanceToStep(visibleSteps[step - 1])} vertical={isSideSetupFlow(flowVariant)} appearance={['Split sidebar', 'Split workspace'].includes(flowVariant) ? 'rows' : 'plain'}/>}
                  introduction={isSplitSetupFlow(flowVariant) ? stepIntroduction : null}
                  actions={
                  <div
                    data-art-exclusion
                    className={cn("w-full mx-auto px-2 sm:px-4 shrink-0 pt-3", activeWidthClass)}
                  >
                    <SetupActions
                      back={currentStep > 1}

                      variant={footerVariant}
                      vertical={flowVariant === 'Action rail'}
                      disabled={!canContinue}
                      loading={isSubmitting}
                      onBack={goBack}
                      middle={flowVariant === 'Original' &&
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
                          : currentStep === 1
                            ? 'Generate story directions'
                            : 'Continue'
                      }
                    />
                  </div>
                  }
                >
                  {waitingForEngine && <p role="status" className="flex items-center gap-2 px-4 py-3 text-sm text-text-muted"><Loader2 className="size-4 animate-spin" />Checking the creative engine…</p>}
                  {engineError && <div role="alert" className="px-4 py-3 text-sm text-danger">{engineError}<Button variant="quiet" onClick={() => { enginePromise.current = testEngine(); }}>Retry connection</Button></div>}
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
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable_both-edges]"
                  >
                    <div className={cn('flex min-h-full flex-col px-1 py-4', currentStep === 7 && 'pb-28')}>
                    <div data-step-content className="my-auto w-full shrink-0 space-y-6">
                    {!isSplitSetupFlow(flowVariant) && stepIntroduction}
                    {/* Step 1: Creative brief */}
                    {currentStep === 1 && (
                      <div
                        data-art-exclusion
                        className={cn("w-full mx-auto px-2 sm:px-4 space-y-6", activeWidthClass)}
                      >
                        <ProjectIdeaInput ref={promptInputRef} variant={ideaInputVariant} value={prompt} onChange={value => handleTextChangeWithUrlExtraction(1, value, setPrompt)} />
                        <ReferenceLinks urls={stepUrls[1] || []} onRemove={(url) => removeUrl(1, url)} />
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
                                Exploring premises, characters, and distinct story directions.
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
                              presentation={storyPresentation}
                              contentVariant={storyContent}
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
                        {chosenStoryIds.map((id) => (
                          <section key={id} className="space-y-4">
                            {/* Cards Visual List */}
                            <div className="w-full mx-auto px-2">
                              <LookPicker
                                variant={visualListVariant}
                                label="Visual look"
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
                        className={cn("w-full mx-auto px-2 sm:px-4", activeWidthClass)}
                      >
                        <div className="mb-8 space-y-5 border-b border-subtle pb-6">
                          <ProjectTitleField value={projectTitle} onChange={value => { setTitle(value); setTitleEdited(true); }} />
                          <div className="space-y-2">
                            <Label htmlFor="project-folder" className="text-xs text-text-muted">Project folder</Label>
                            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                              <Input id="project-folder" value={folderPath} onChange={event => setFolderPath(event.target.value)} placeholder={displayedLocation} aria-describedby="project-folder-help" />
                              <Button variant="secondary" borderTone="subtle" loading={isPickingDir} onClick={handlePickDirectory}><FolderOpen />Choose folder</Button>
                            </div>
                            <p id="project-folder-help" className="break-all text-xs text-text-muted">Save to: {displayedLocation}</p>
                          </div>
                        </div>
                        <SetupReview
                          name={projectTitle.trim() || chosenStory?.title || 'Untitled Video Project'}
                          showProjectDetails={false}
                          location={displayedLocation}
                          engine={selectedModel}
                          mood={selectedMood || (customMood.trim() ? 'Custom mood' : '')}
                          moodNotes={selectedMood === 'Custom prompt' ? customMood : ''}
                          directions={chosenStoryIds.map((id) => ({
                            id,
                            title:
                              allVariations.find((item) => item.id === id)?.title ||
                              `Direction ${id}`,
                            look: branchAesthetics[id] || 'Liquid Glass',
                            customLook: branchAesthetics[id] === 'Custom look' ? customAesthetics[id] || '' : '',
                          }))}
                        />
                        <ProjectSettingsFields
                          aspect={selectedAspect}
                          onAspectChange={setSelectedAspect}
                          duration={selectedDuration}
                          onDurationChange={setSelectedDuration}
                          notes={customSpecs}
                          onNotesChange={value => handleTextChangeWithUrlExtraction(2, value, setCustomSpecs)}
                          references={<ReferenceLinks urls={stepUrls[2] || []} onRemove={url => removeUrl(2, url)} />}
                        />
                      </div>
                    )}
                    </div>
                    </div>
                  </div>

                </SetupFlow>
              </form>

          <EmptyProjectAction disabled={isSubmitting} onClick={skipDirectToStudio} />

          {VisualListTools && (
            <React.Suspense fallback={null}>
              <VisualListTools
                onChange={setVisualListVariant}
                onWidthChange={setWizardWidth}
                onStepIndicatorChange={setStepIndicatorVariant}
                onFlowChange={setFlowVariant}
                onFooterChange={setFooterVariant}
                onHeaderChange={setHeaderVariant}
                onStoryChange={setStoryPresentation}
                onStoryContentChange={setStoryContent}
                onIdeaInputChange={setIdeaInputVariant}
                onInputChange={setInputVariant}
                initialVariant={visualListVariant}
                initialWidth={wizardWidth}
                initialStepIndicator={stepIndicatorVariant}
              />
            </React.Suspense>
          )}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root></SetupInputContext.Provider>
  );
};
