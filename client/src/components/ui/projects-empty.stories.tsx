import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProjectsEmpty, projectsEmptyVariants } from './projects-empty';
const meta = { title: 'Patterns/Projects empty', component: ProjectsEmpty } satisfies Meta<typeof ProjectsEmpty>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Variants: Story = { args: { onCreate: () => {}, onOpen: () => {} }, render: args => <div className="w-[min(720px,90vw)] space-y-8">{projectsEmptyVariants.map(variant => <ProjectsEmpty key={variant} {...args} variant={variant}/>)}</div> };
