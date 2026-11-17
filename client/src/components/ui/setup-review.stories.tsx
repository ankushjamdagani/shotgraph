import type {Meta,StoryObj} from '@storybook/react-vite';
import {SetupReview} from './setup-review';
const meta={title:'Patterns/Setup review',component:SetupReview} satisfies Meta<typeof SetupReview>;
export default meta;
type Story=StoryObj<typeof meta>;
export const VisualSummary:Story={args:{name:'Morning light',location:'~/Movies/VS_Projects/morning_light',format:'16:9 · 30 seconds',engine:'antigravity-cli',mood:'Warm & uplifting',moodNotes:'Gentle camera movement and golden-hour warmth.',directions:[{id:1,title:'Coastal drift',look:'Editorial 35mm',customLook:'Soft highlights and natural texture.'}]},render:args=><div className="w-[min(720px,85vw)]"><SetupReview {...args}/></div>};
