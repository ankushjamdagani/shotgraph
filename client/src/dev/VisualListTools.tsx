import { setupActionsVariants, type SetupActionsVariant } from '../components/ui/setup-actions';
import { useState, useEffect } from 'react';
import { LevaPanel, useControls, useCreateStore, button } from 'leva';
import { SlidersHorizontal } from 'lucide-react';
import { IconButton } from '../components/ui';
import { visualListVariants, type VisualListVariant } from '../components/ui/visual-choice-list';
import { stepIndicatorVariants, type StepIndicatorVariant } from '../components/ui/step-indicator';

export interface VisualListToolsProps {
  onChange?: (variant: VisualListVariant) => void;
  onVariantChange?: (variant: VisualListVariant) => void;
  onWidthChange?: (width: 'compact' | 'balanced' | 'wide' | 'full') => void;
  onFooterChange?: (variant: SetupActionsVariant) => void;
  onStepIndicatorChange?: (indicator: StepIndicatorVariant) => void;
  initialVariant?: VisualListVariant;
  initialWidth?: 'compact' | 'balanced' | 'wide' | 'full';
  initialStepIndicator?: StepIndicatorVariant;
}

export default function VisualListTools({
  onChange,
  onVariantChange,
  onWidthChange,
  onStepIndicatorChange,
  onFooterChange,
  initialVariant = 'Arched fan',
  initialWidth = 'compact',
  initialStepIndicator = 'counter',
}: VisualListToolsProps) {
  const store = useCreateStore();
  const [open, setOpen] = useState(false);

  const [values, set] = useControls(
    'Create Project · Debugger',
    () => ({
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
      footerLayout: { value: 'split', options: [...setupActionsVariants], label: 'Footer layout' },
      Reset: button(() =>
        set({
          formWidth: 'compact',
          cardLayout: 'Arched fan',
          stepIndicator: 'counter',
          footerLayout: 'split',
        }),
      ),
    }),
    { store },
  );

  useEffect(() => {
    const layout = values.cardLayout as VisualListVariant;
    onChange?.(layout);
    onVariantChange?.(layout);
  }, [values.cardLayout, onChange, onVariantChange]);

  useEffect(() => {
    onWidthChange?.(values.formWidth as 'compact' | 'balanced' | 'wide' | 'full');
  }, [values.formWidth, onWidthChange]);

  useEffect(() => {
    onStepIndicatorChange?.(values.stepIndicator as StepIndicatorVariant);
  }, [values.stepIndicator, onStepIndicatorChange]);

  useEffect(() => { onFooterChange?.(values.footerLayout as SetupActionsVariant); }, [values.footerLayout, onFooterChange]);

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
