import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryContent, storyContentVariants } from './story-content';
const concept = {
 title: 'The familiar stranger', summary: 'A traveler returns home and meets someone who remembers a different version of them.',
 story: 'A traveler returns to the town they left behind, expecting familiar streets and unfamiliar faces. An unexpected friendship challenges the story they have told themselves about leaving. Caught between a fresh start and the comfort of belonging, they discover that coming home can mean becoming someone new.',
 subject: 'A traveler confronting their past', tension: 'Belonging versus starting over', payoff: 'Finding a new meaning of home',
 pitch: 'A traveler returns home and befriends someone who remembers them differently. Their encounter challenges what it means to belong.', distinction: 'An intimate reunion seen through conflicting memories',
};
const meta = { title: 'Patterns/Story content', component: StoryContent, args: { concept, variant: 'Original paragraph' } } satisfies Meta<typeof StoryContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Variants: Story = { render: args => <div className="w-[min(640px,90vw)] space-y-10">{storyContentVariants.map(variant => <section key={variant}><h2 className="mb-4 text-sm font-semibold">{variant}</h2><StoryContent {...args} variant={variant} image={variant === 'Concept + reference image' ? '/look-previews/editorial.jpg' : undefined}/></section>)}</div> };
export const Expanded: Story = { args: { variant: 'Progressive detail', expanded: true } };
export const OlderDraft: Story = { args: { variant: 'Hook + three lines', concept: { title: concept.title, story: concept.story } } };
