import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StoryDeck, type StoryDirection } from './story-deck';

const directions: StoryDirection[] = ['Coastal drift', 'Meadow reverie', 'City at dawn'].map(
  (title, index) => ({
    id: index + 1,
    title,
    summary: `A meditative exploration of ${title.toLowerCase()} that captures fleeting cinematic light.`,
    story: `The sequence begins with an intimate macro perspective revealing natural textures and atmospheric elements. As the environment slowly transitions, camera momentum accelerates to match the changing light. The narrative concludes with an expansive cinematic wide shot, letting the silence and emotional resolution resonate deeply before the cut.`,
    durationLabel: '30s · 3 beats',
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

export const ArchedFan: Story = {
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
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(id)) {
                if (next.size > 1) next.delete(id);
              } else next.add(id);
              return next;
            })
          }
        />
      </div>
    );
  },
};

