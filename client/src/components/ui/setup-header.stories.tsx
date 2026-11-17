import type { Meta, StoryObj } from '@storybook/react-vite';
import { SetupHeader, setupHeaderVariants } from './setup-header';
const meta = { title: 'Patterns/Setup header', component: SetupHeader } satisfies Meta<typeof SetupHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Variants: Story = { args: { step: 'Format', position: 2, onClose: () => {} }, render: args => <div className="w-[min(900px,95vw)] space-y-8">{setupHeaderVariants.map(variant => <SetupHeader key={variant} {...args} variant={variant}/>)}</div> };

export const QuietBrand: Story = { args: { step: 'Brief', position: 1, showProjectLabel: false, onClose: () => {} } };
