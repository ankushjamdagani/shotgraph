import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Plus } from 'lucide-react';
import { Thumbnail, Table, TableHead, TableCell, TableRow } from './collection';
import { InlineRename } from './inline-rename';
import { Badge, NewItemIndicator } from './badge';
import { Button } from './button';
const meta = { title: 'Patterns/Collections' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Cards: Story = {
  render: () => (
    <div className="grid w-[min(760px,80vw)] grid-cols-2 gap-6">
      <article className="group">
        <Thumbnail>
          <Plus className="size-7 text-text-muted" />
        </Thumbnail>
        <h3 className="mt-4 text-sm font-semibold">New Project</h3>
        <p className="mt-2 text-xs text-text-muted">Start with a brief</p>
      </article>
      <article className="group">
        <Thumbnail>
          <span className="text-sm text-text-muted">Project preview</span>
          <NewItemIndicator />
        </Thumbnail>
        <h3 className="mt-4 text-sm font-semibold">Summer film</h3>
        <p className="mt-2 text-xs text-text-muted">9:16 · 00:30 · 30 FPS</p>
      </article>
    </div>
  ),
};
export const Rows: Story = {
  render: () => (
    <div className="w-[min(760px,80vw)]">
      <Table>
        <thead>
          <tr>
            <TableHead>Project</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Last opened</TableHead>
          </tr>
        </thead>
        <tbody>
          {['Summer film', 'Product demo'].map((name, i) => (
            <TableRow key={name}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Thumbnail compact>
                    {i === 0 && <NewItemIndicator side="left" small />}
                  </Thumbnail>
                  {name}
                </div>
              </TableCell>
              <TableCell>9:16 · 00:30 · 30 fps</TableCell>
              <TableCell>Just now</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  ),
};
export const Editing: Story = {
  render: function Editing() {
    const [editing, setEditing] = useState(false),
      [value, setValue] = useState('Summer film');
    return (
      <div className="w-80 space-y-4">
        <div className="relative flex h-6 items-center">
          {editing ? (
            <InlineRename
              value={value}
              onChange={setValue}
              onSave={() => setEditing(false)}
              onCancel={() => {
                setValue('Summer film');
                setEditing(false);
              }}
            />
          ) : (
            <span className="text-sm font-semibold">{value}</span>
          )}
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Rename
        </Button>
        <Button variant="ghost">Outside editor</Button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Rename' }));
    await expect(
      c.getByRole('textbox', { name: 'Project name' }),
    ).toHaveFocus();
    await userEvent.click(c.getByRole('button', { name: 'Outside editor' }));
    await expect(c.queryByRole('textbox')).not.toBeInTheDocument();
  },
};
export const Badges: Story = {
  render: () => (
    <div className="flex gap-3">
      <Badge>Active</Badge>
      <Badge>9:16</Badge>
      <Badge>30 FPS</Badge>
    </div>
  ),
};
