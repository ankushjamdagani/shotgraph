import type { ProjectIdeaInputVariant } from './project-idea-input';
import type { SetupFlowVariant } from './setup-flow';
import type { SetupHeaderVariant } from './setup-header';
import type { SetupInputVariant } from './input';
import type { SetupActionsVariant } from './setup-actions';
import type { StepIndicatorVariant } from './step-indicator';
import type { StoryContentVariant } from './story-content';
import type { StoryPresentationVariant } from './story-deck';
import type { VisualListVariant } from './visual-choice-list';

/** Approved creation composition, shared by production, comparison controls and stories. */
export const setupDefaults = {
  ideaInput: 'Framed canvas',
  flowLayout: 'Quiet focus',
  formWidth: 'compact',
  cardLayout: 'Cover flow',
  stepIndicator: 'none',
  storyContent: 'Original paragraph',
  storyPresentation: 'Story spread',
  headerLayout: 'compact',
  inputStyle: 'soft',
  footerLayout: 'split',
} as const satisfies {
  ideaInput: ProjectIdeaInputVariant;
  flowLayout: SetupFlowVariant;
  formWidth: 'compact' | 'balanced' | 'wide' | 'full';
  cardLayout: VisualListVariant;
  stepIndicator: StepIndicatorVariant;
  storyContent: StoryContentVariant;
  storyPresentation: StoryPresentationVariant;
  headerLayout: SetupHeaderVariant;
  inputStyle: SetupInputVariant;
  footerLayout: SetupActionsVariant;
};
