import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Copy,
  Pencil,
  Trash2,
  MoreHorizontal,
  Grid2X2,
  List,
} from 'lucide-react';
import { Button, IconButton } from './button';
import { Tooltip } from './tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './dropdown-menu';
import { SegmentedControl } from './segmented-control';
const meta = {
  title: 'Controls/Navigation',
  component: SegmentedControl,
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj;
export const Filters: Story = {
  render: function Filters() {
    const [value, setValue] = useState('all');
    return (
      <SegmentedControl
        label="Aspect ratio"
        value={value}
        onValueChange={setValue}
        options={[
          { value: 'all', label: 'All' },
          { value: '9:16', label: '9:16' },
          { value: '16:9', label: '16:9' },
        ]}
      />
    );
  },
};
export const ViewSwitch: Story = {
  render: function ViewSwitch() {
    const [value, setValue] = useState('grid');
    return (
      <SegmentedControl
        label="Project view"
        value={value}
        onValueChange={setValue}
        options={[
          { value: 'grid', label: 'Grid view', content: <Grid2X2 /> },
          { value: 'list', label: 'List view', content: <List /> },
        ]}
      />
    );
  },
};
export const ActionMenu: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Project actions" variant="secondary">
          <MoreHorizontal />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <Copy />
          Copy project
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Pencil />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive>
          <Trash2 />
          Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
export const Help: Story = {
  render: () => (
    <Tooltip label="Create a new project from a brief">
      <Button>New Project</Button>
    </Tooltip>
  ),
};
