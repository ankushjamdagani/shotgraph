import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyProjectAction } from './empty-project-action';
const meta = { title: 'Patterns/Empty project shortcut', component: EmptyProjectAction, args: { onClick: () => {} } } satisfies Meta<typeof EmptyProjectAction>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Floating: Story = {};
export const Disabled: Story = { args: { disabled: true } };
