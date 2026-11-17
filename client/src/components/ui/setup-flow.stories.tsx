import { useState } from 'react';
import { ProjectIdeaInput } from './project-idea-input';
import { AsciiArt } from './ascii-art';
import { getDefaultStartAppearance } from './page-background';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SetupFlow, isSideSetupFlow, setupFlowVariants, type SetupFlowVariant } from './setup-flow';
import { SetupHeader } from './setup-header';
import { SetupActions } from './setup-actions';
import { StepIndicator } from './step-indicator';
import { setupDefaults } from './setup-defaults';
import { Input, Textarea, Label, SetupInputContext } from './input';

const steps = ['Brief', 'Story', 'Mood', 'Look', 'Review'];
function Example({ variant = 'Original', approved = false }: { variant?: SetupFlowVariant; approved?: boolean }) {
  const side = isSideSetupFlow(variant);
  const [idea, setIdea] = useState('');
  return <SetupInputContext.Provider value={approved ? setupDefaults.inputStyle : null}><form className="flex h-[min(900px,100dvh)] min-h-[560px] flex-col bg-app text-text-primary" onSubmit={e => e.preventDefault()}>
    <SetupFlow background={<AsciiArt appearance={getDefaultStartAppearance()} exclusionStyle="soft" />} variant={variant} columnClassName="max-w-[832px]"
      header={<SetupHeader variant={approved ? setupDefaults.headerLayout : 'brand'} showProjectLabel={variant !== 'Quiet focus'} step="Brief" position={1} total={steps.length} onClose={() => {}} className={side ? undefined : 'max-w-[832px]'}/>}
      introduction={approved ? null : <div className={`mx-auto max-w-[832px] space-y-2 px-4 pb-5 ${variant === 'Quiet focus' ? 'text-center' : ''}`}><h1 className="text-3xl font-semibold tracking-tight">What are we creating?</h1><p className="text-sm text-text-muted">Start with an idea. Shape the details as you go.</p></div>}
      progress={<StepIndicator steps={steps} currentStep={1} furthestStep={2} onStepClick={() => {}} variant={approved ? setupDefaults.stepIndicator : side ? 'chapters' : 'counter'} vertical={side} appearance={['Split sidebar', 'Split workspace'].includes(variant) ? 'rows' : 'plain'}/>}
      actions={<div className="mx-auto max-w-[832px] px-4"><SetupActions back={false} primary="Continue" onBack={() => {}} vertical={variant === 'Action rail'}/></div>}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="flex min-h-full flex-col py-4">
          <div className="mx-auto my-auto w-full max-w-[832px] shrink-0 space-y-6">
            {approved ? <>
              <h1 className="pb-3 text-center text-3xl font-semibold tracking-tight">Start with an idea.</h1>
              <ProjectIdeaInput variant={setupDefaults.ideaInput} value={idea} onChange={setIdea}/>
            </> : <>
              <div className="space-y-2"><Label htmlFor="flow-title">Project title</Label><Input id="flow-title" defaultValue="The long way home"/></div>
              <div className="space-y-2"><Label htmlFor="flow-idea">Description</Label><Textarea id="flow-idea" rows={7} defaultValue="A traveler returns to a city they once called home. An unexpected encounter changes the course of an ordinary morning."/><p className="text-xs text-text-muted">Include reference links, or start with just a thought.</p></div>
            </>}
          </div>
        </div>
      </div>
    </SetupFlow>
  </form></SetupInputContext.Provider>;
}
const meta = { title: 'Patterns/Setup flow', component: Example, parameters: { layout: 'fullscreen' }, argTypes: { variant: { control: 'select', options: setupFlowVariants } } } satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Original: Story = { args: { variant: 'Original' } };
export const AlignedBands: Story = { args: { variant: 'Aligned bands' } };
export const FramedWorkspace: Story = { args: { variant: 'Framed workspace' } };
export const QuietFocus: Story = { args: { variant: 'Quiet focus' } };
export const ChapterRail: Story = { args: { variant: 'Chapter rail' } };
export const SplitIntroduction: Story = { args: { variant: 'Split introduction' } };
export const ActionRail: Story = { args: { variant: 'Action rail' } };

export const SplitAnchored: Story = { args: { variant: 'Split anchored' } };
export const SplitSidebar: Story = { args: { variant: 'Split sidebar' } };
export const SplitWorkspace: Story = { args: { variant: 'Split workspace' } };
export const SplitOpen: Story = { args: { variant: 'Split open' } };
export const SplitCompact: Story = { args: { variant: 'Split compact' } };

export const ApprovedDefaults: Story = { args: { variant: setupDefaults.flowLayout, approved: true } };
