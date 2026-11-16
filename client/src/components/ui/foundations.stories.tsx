import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, IconButton } from './button';
import { Sun } from 'lucide-react';
import { Separator } from './separator';
import { toast } from '../../services/toastService';
const meta = {
  title: 'Foundations/Overview',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Tokens: Story = {
  render: () => (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Shotgraph design system
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          An evolving baseline from the approved Projects screen. Radix
          behavior, Tailwind styles, shared tokens. Switch themes from the
          Storybook toolbar.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['App', 'bg-app'],
          ['Surface', 'bg-surface'],
          ['Card', 'bg-card'],
          ['Hover', 'bg-hover'],
        ].map(([name, style]) => (
          <div key={name}>
            <div className={'h-20 rounded-lg border border-subtle ' + style} />
            <p className="mt-2 text-sm">{name}</p>
          </div>
        ))}
      </div>
      <Separator />
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Type & controls</h2>
        <p className="text-sm text-text-muted">
          Plus Jakarta Sans for UI. JetBrains Mono for technical measurements.
          Default controls are 34px; small 28px; large 40px.
        </p>
        <div className="flex items-center gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <IconButton label="Theme" variant="secondary">
            <Sun />
          </IconButton>
        </div>
      </div>
      <Separator />
      <div>
        <h2 className="text-xl font-semibold">Motion</h2>
        <p className="mt-2 text-sm text-text-muted">
          150ms for hover; 240ms for reordering; 520ms for a new card.
          Reduced-motion preferences disable nonessential movement. Notification
          markers last six seconds.
        </p>
      </div>
    </div>
  ),
};
export const Notifications: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() =>
          toast.success('Summer film', 'Project copied', 6500, {
            label: 'Show',
            onClick: () => {},
          })
        }
      >
        Copy toast
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast.success('Summer film', 'Project renamed')}
      >
        Rename toast
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast.success('Summer film', 'Moved to Trash')}
      >
        Delete toast
      </Button>
      <Button
        variant="destructive"
        onClick={() =>
          toast.error(
            'The folder could not be moved. Its files were preserved.',
          )
        }
      >
        Error toast
      </Button>
    </div>
  ),
};
