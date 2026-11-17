import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input, Textarea, Label, SetupInputContext, setupInputVariants } from './input';
const meta = { title: 'Patterns/Setup inputs', component: Textarea } satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Variants: Story = { render: () => <div className="w-[min(640px,85vw)] space-y-8">{setupInputVariants.map(variant => <SetupInputContext.Provider key={variant} value={variant}><div className="space-y-3"><Label htmlFor={`title-${variant}`}>{variant} · Project title</Label><Input id={`title-${variant}`} placeholder="Untitled project"/><Label htmlFor={`notes-${variant}`}>Creative notes</Label><Textarea id={`notes-${variant}`} placeholder="Describe a scene, a mood, or a visual direction…"/></div></SetupInputContext.Provider>)}</div> };
