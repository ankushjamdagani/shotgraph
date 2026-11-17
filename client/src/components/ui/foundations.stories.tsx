import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Input } from './input';
import { getPageBackground } from './page-background';

const meta = { title: 'Foundations/Approved system' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Semantic swatches resolve against Storybook's light/dark theme toolbar. */
export const Tokens: Story = {
  render: () => <div className="w-[min(760px,85vw)] space-y-8 p-6 text-text-primary" style={getPageBackground()}>
    <div><h1 className="text-xl font-semibold">Warm Stock · neutral controls</h1><p className="mt-2 text-sm text-text-muted">Color supports feedback and artwork. Actions stay neutral.</p></div>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[
      ['App', 'var(--bg-app)'], ['Surface', 'var(--bg-surface)'], ['Card', 'var(--bg-card)'], ['Hover', 'var(--bg-hover)'],
      ['Primary ink', 'var(--text-primary)'], ['Muted ink', 'var(--text-muted)'], ['Notification', 'var(--notification)'], ['Danger', 'var(--danger)'],
    ].map(([label, color]) => <div key={label}><div className="h-16 rounded-md border border-subtle" style={{background:color}}/><p className="mt-2 text-xs">{label}</p></div>)}</div>
    <div className="flex flex-wrap items-center gap-3"><Button size="sm">Small · 28</Button><Button>Standard · 34</Button><Button size="lg">Large · 40</Button><Button variant="secondary" borderTone="subtle">Secondary</Button><Button variant="ghost">Ghost</Button></div>
    <div className="space-y-3"><Input borderTone="subtle" aria-label="Collection search" placeholder="Subtle collection boundary"/><Input aria-label="Form field" placeholder="Stronger form boundary"/><p className="text-xs text-text-muted">Tab through controls to inspect the 1px focus ring and 1px offset.</p></div>
  </div>,
};
