import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Input, Label, Textarea } from './input';
import { Switch, Checkbox } from './switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './select';
const meta = { title: 'Controls/Fields', component: Input } satisfies Meta<
  typeof Input
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Text: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="project-name">Project name</Label>
      <Input id="project-name" placeholder="Untitled project" />
      <p className="text-xs text-text-muted">Names can be changed later.</p>
    </div>
  ),
};
export const Invalid: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="invalid-name">Project name</Label>
      <Input
        id="invalid-name"
        aria-invalid
        aria-describedby="name-error"
        defaultValue=""
      />
      <p id="name-error" className="text-xs text-danger">
        Enter a project name.
      </p>
    </div>
  ),
};
export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Saving project…',
    'aria-label': 'Project name',
  },
};
export const Brief: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="brief">Brief</Label>
      <Textarea id="brief" placeholder="What are you making?" />
    </div>
  ),
};
export const Choices: Story = {
  render: function Choices() {
    const [enabled, setEnabled] = useState(false);
    return (
      <div className="w-80 space-y-6">
        <div className="flex items-center gap-3">
          <Switch
            id="autosave"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <Label htmlFor="autosave">Autosave</Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox id="guidance" defaultChecked />
          <Label htmlFor="guidance">Show guidance</Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="format">Aspect ratio</Label>
          <Select defaultValue="9:16">
            <SelectTrigger id="format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="9:16">9:16 · Portrait</SelectItem>
              <SelectItem value="16:9">16:9 · Landscape</SelectItem>
              <SelectItem value="1:1">1:1 · Square</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  },
};

export const CollectionSearch: Story = {
  args: { type: 'search', borderTone: 'subtle', placeholder: 'Search projects…', 'aria-label': 'Search projects' },
};

export const PlainWriting: Story = {
  render: () => <div className="w-[min(640px,85vw)] space-y-5"><Label htmlFor="plain-idea">Your idea</Label><Textarea id="plain-idea" variant="plain" className="min-h-48 text-2xl leading-relaxed" placeholder="A story, a scene, a character…"/><Input variant="plain" aria-label="Folder path" placeholder="Enter a folder path"/></div>,
};
