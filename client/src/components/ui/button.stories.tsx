import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Plus, Sun } from 'lucide-react';
import { Button, IconButton } from './button';
const meta = {
  title: 'Controls/Button',
  component: Button,
  args: { children: 'New Project', onClick: fn() },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'quiet', 'destructive'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Use primary for the main action, ghost for secondary actions, destructive only for confirmation. Default controls and icon buttons are 34px high. Radix Slot supports asChild composition.',
      },
    },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'New Project' }),
    );
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['primary', 'secondary', 'ghost', 'quiet', 'destructive'] as const).map(
        (variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ),
      )}
    </div>
  ),
};
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
      <IconButton label="Switch theme" variant="secondary">
        <Sun />
      </IconButton>
    </div>
  ),
};
export const States: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button>
        <Plus />
        New Project
      </Button>
      <Button loading>Saving…</Button>
      <Button disabled>Unavailable</Button>
      <IconButton label="Saving" loading>
        <Plus />
      </IconButton>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: 'Saving…' }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: 'Unavailable' }),
    ).toBeDisabled();
  },
};

export const SubtleBorder: Story = { args: { variant: 'secondary', borderTone: 'subtle', children: 'Open folder' } };

export const Soft: Story = { args: { variant: 'soft', children: 'Change folder' } };
