import { projectIdeaInputVariants, type ProjectIdeaInputVariant } from '../components/ui/project-idea-input';
import { setupDefaults } from '../components/ui/setup-defaults';
import { setupFlowVariants, type SetupFlowVariant } from '../components/ui/setup-flow';
import { storyContentVariants, type StoryContentVariant } from '../components/ui/story-content';
import { storyPresentationVariants, type StoryPresentationVariant } from '../components/ui/story-deck';
import { setupHeaderVariants, type SetupHeaderVariant } from '../components/ui/setup-header';
import { setupInputVariants, type SetupInputVariant } from '../components/ui/input';
import { setupActionsVariants, type SetupActionsVariant } from '../components/ui/setup-actions';
import { useState, useEffect } from 'react';
import { LevaPanel, useControls, useCreateStore, button } from 'leva';
import { SlidersHorizontal } from 'lucide-react';
import { IconButton } from '../components/ui';
import { visualListVariants, type VisualListVariant } from '../components/ui/visual-choice-list';
import { stepIndicatorVariants, type StepIndicatorVariant } from '../components/ui/step-indicator';

export interface VisualListToolsProps {
  onIdeaInputChange?: (variant: ProjectIdeaInputVariant) => void;
  onFlowChange?: (variant: SetupFlowVariant) => void;
  onChange?: (variant: VisualListVariant) => void;
  onWidthChange?: (width: 'compact' | 'balanced' | 'wide' | 'full') => void;
  onStoryContentChange?: (variant: StoryContentVariant) => void;
  onStoryChange?: (variant: StoryPresentationVariant) => void;
  onHeaderChange?: (variant: SetupHeaderVariant) => void;
  onInputChange?: (variant: SetupInputVariant) => void;
  onFooterChange?: (variant: SetupActionsVariant) => void;
  onStepIndicatorChange?: (indicator: StepIndicatorVariant) => void;
  initialVariant?: VisualListVariant;
  initialWidth?: 'compact' | 'balanced' | 'wide' | 'full';
  initialStepIndicator?: StepIndicatorVariant;
}

export default function VisualListTools({
  onIdeaInputChange,
  onFlowChange,
  onChange,
  onWidthChange,
  onStepIndicatorChange,
  onFooterChange,
  onHeaderChange,
  onStoryChange,
  onStoryContentChange,
  onInputChange,
  initialVariant = setupDefaults.cardLayout,
  initialWidth = setupDefaults.formWidth,
  initialStepIndicator = setupDefaults.stepIndicator,
}: VisualListToolsProps) {
  const store = useCreateStore();
  const [open, setOpen] = useState(false);

  const [values, set] = useControls(
    'Create Project · Debugger',
    () => ({
      ideaInput: { value: setupDefaults.ideaInput, options: [...projectIdeaInputVariants], label: 'Idea input' },
      flowLayout: { value: setupDefaults.flowLayout, options: [...setupFlowVariants], label: 'Flow structure' },
      formWidth: {
        value: initialWidth,
        options: ['compact', 'balanced', 'wide', 'full'] as const,
        label: 'Form width',
      },
      cardLayout: {
        value: initialVariant,
        options: [...visualListVariants],
        label: 'Card layout',
      },
      stepIndicator: {
        value: initialStepIndicator,
        options: [...stepIndicatorVariants],
        label: 'Steps indicator',
      },
      storyContent: { value: setupDefaults.storyContent, options: [...storyContentVariants], label: 'Story content' },
      storyPresentation: { value: setupDefaults.storyPresentation, options: [...storyPresentationVariants], label: 'Story layout' },
      headerLayout: { value: setupDefaults.headerLayout, options: [...setupHeaderVariants], label: 'Header' },
      inputStyle: { value: setupDefaults.inputStyle, options: [...setupInputVariants], label: 'Text inputs' },
      footerLayout: { value: setupDefaults.footerLayout, options: [...setupActionsVariants], label: 'Footer layout' },
      Reset: button(() =>
        set({ ...setupDefaults }),
      ),
    }),
    { store },
  );

  useEffect(() => {
    const layout = values.cardLayout as VisualListVariant;
    onChange?.(layout);
  }, [values.cardLayout, onChange]);

  useEffect(() => {
    onWidthChange?.(values.formWidth as 'compact' | 'balanced' | 'wide' | 'full');
  }, [values.formWidth, onWidthChange]);

  useEffect(() => {
    onStepIndicatorChange?.(values.stepIndicator as StepIndicatorVariant);
  }, [values.stepIndicator, onStepIndicatorChange]);

  useEffect(() => { onFooterChange?.(values.footerLayout as SetupActionsVariant); }, [values.footerLayout, onFooterChange]);

  useEffect(() => { onHeaderChange?.(values.headerLayout as SetupHeaderVariant); }, [values.headerLayout, onHeaderChange]);
  useEffect(() => { onInputChange?.(values.inputStyle as SetupInputVariant); }, [values.inputStyle, onInputChange]);

  useEffect(() => { onStoryChange?.(values.storyPresentation as StoryPresentationVariant); }, [values.storyPresentation, onStoryChange]);
  useEffect(() => { onStoryContentChange?.(values.storyContent as StoryContentVariant); }, [values.storyContent, onStoryContentChange]);
  useEffect(() => { onFlowChange?.(values.flowLayout as SetupFlowVariant); }, [values.flowLayout, onFlowChange]);
  useEffect(() => { onIdeaInputChange?.(values.ideaInput as ProjectIdeaInputVariant); }, [values.ideaInput, onIdeaInputChange]);
  return (
    <>
      <div className="fixed bottom-5 left-5 z-[60]">
        <IconButton
          variant="secondary"
          borderTone="subtle"
          label="Wizard debug controls (width, cards, steps)"
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal />
        </IconButton>
      </div>
      <LevaPanel
        store={store}
        hidden={!open}
        titleBar={{ title: 'Wizard · Design controls' }}
      />
    </>
  );
}
