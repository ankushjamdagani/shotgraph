import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ChoiceGroup } from './choice-group';
const meta = { title: 'Inputs/Choice group', component: ChoiceGroup } satisfies Meta<typeof ChoiceGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ProjectFormat: Story = {
    args: { label: 'Aspect ratio', value: '9:16', onChange: () => { }, options: [{ value: '9:16', label: 'Portrait · 9:16', description: '1080 × 1920' }, { value: '16:9', label: 'Landscape · 16:9', description: '1920 × 1080' }, { value: '1:1', label: 'Square · 1:1', description: '1080 × 1080' }] },
    render: function Example(args) { const [value, setValue] = useState(args.value); return <div className="w-[min(680px,85vw)]"><ChoiceGroup {...args} value={value} onChange={setValue}/></div>; },
};
