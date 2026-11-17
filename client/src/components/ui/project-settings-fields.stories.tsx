import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ProjectSettingsFields } from './project-settings-fields';
import { SetupInputContext } from './input';
const meta = { title: 'Patterns/Project review settings', component: ProjectSettingsFields, args: { aspect: '16:9', duration: 30, notes: '', onAspectChange: () => {}, onDurationChange: () => {}, onNotesChange: () => {} } } satisfies Meta<typeof ProjectSettingsFields>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editable: Story = { render: function Example() {
  const [aspect, setAspect] = useState<'9:16' | '16:9' | '1:1'>('16:9');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');
  return <SetupInputContext.Provider value="soft"><div className="w-[min(720px,90vw)]"><ProjectSettingsFields aspect={aspect} onAspectChange={setAspect} duration={duration} onDurationChange={setDuration} notes={notes} onNotesChange={setNotes}/></div></SetupInputContext.Provider>;
} };
