import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { storyContentVariants } from './story-content';
import { StoryDeck, storyPresentationVariants, type StoryDirection } from './story-deck';

const directions: StoryDirection[] = ['Coastal drift', 'Meadow reverie', 'City at dawn'].map(
  (title, index) => ({
    id: index + 1,
    title,
    summary: `A meditative exploration of ${title.toLowerCase()} that captures fleeting cinematic light.`,
    story: `The sequence begins with an intimate macro perspective revealing natural textures and atmospheric elements. As the environment slowly transitions, camera momentum accelerates to match the changing light. The narrative concludes with an expansive cinematic wide shot, letting the silence and emotional resolution resonate deeply before the cut.`,
    subject: 'A traveler seeing a familiar place differently',
    tension: 'The pull of memory versus the possibility of change',
    payoff: 'Renewed curiosity about the everyday',
    pitch: 'A traveler discovers an unexpected connection in a familiar place. The encounter changes how they see their own life.',
    distinction: 'An intimate encounter told through small observations',
    durationLabel: 'Story concept',
    beats: [
      { label: 'Opening', text: 'A quiet detail introduces the setting.' },
      { label: 'Movement', text: 'The camera follows the subject into a changing landscape.' },
      { label: 'Closing', text: 'A final wide frame lets the moment settle.' },
    ],
  }),
);

const meta = {
  title: 'Patterns/Story deck',
  component: StoryDeck,
} satisfies Meta<typeof StoryDeck>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EditorialCarousel: Story = {
  args: {
    directions,
    selected: new Set([1]),
    onToggle: () => {},
  },
  render: function Example(args) {
    const [selected, setSelected] = useState(new Set([1]));
    const [prompt, setPrompt] = useState('');
    return (
      <div className="w-full max-w-[1240px] mx-auto py-8">
        <StoryDeck
          {...args}
          selected={selected}
          customPrompt={prompt}
          onCustomPromptChange={setPrompt}
          onToggle={(id) =>
            setSelected(new Set([id]))
          }
        />
      </div>
    );
  },
};


export const Presentations: Story = { args: EditorialCarousel.args, render: function Examples(args) {
 const [selected, setSelected] = useState(new Set([1]));
 return <div className="space-y-12">{storyPresentationVariants.map(presentation => <section key={presentation}><h2 className="mb-4 text-lg font-semibold">{presentation}</h2><StoryDeck {...args} presentation={presentation} selected={selected} onToggle={id => setSelected(new Set([id]))}/></section>)}</div>;
} };

export const ScreenplayDeck: Story = { ...EditorialCarousel, args: { ...EditorialCarousel.args, presentation: 'Screenplay deck' } };
export const Filmstrip: Story = { ...EditorialCarousel, args: { ...EditorialCarousel.args, presentation: 'Filmstrip' } };
export const StorySpread: Story = { ...EditorialCarousel, args: { ...EditorialCarousel.args, presentation: 'Story spread' } };
export const FocusStage: Story = { ...EditorialCarousel, args: { ...EditorialCarousel.args, presentation: 'Focus stage' } };
export const StoryGallery: Story = { ...EditorialCarousel, args: { ...EditorialCarousel.args, presentation: 'Story gallery' } };

export const ContentFormats: Story = { args: EditorialCarousel.args, render: function Formats(args) { const [selected,setSelected] = useState(new Set([1])); return <div className="space-y-10">{storyContentVariants.map(contentVariant => <section key={contentVariant}><h2 className="mb-3 text-sm font-semibold">{contentVariant}</h2><StoryDeck {...args} contentVariant={contentVariant} selected={selected} onToggle={id => setSelected(new Set([id]))}/></section>)}</div>; } };
