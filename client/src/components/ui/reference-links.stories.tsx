import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReferenceLinks } from './reference-links';
const meta={title:'Patterns/Reference links',component:ReferenceLinks} satisfies Meta<typeof ReferenceLinks>;
export default meta;
type Story=StoryObj<typeof meta>;
export const References:Story={args:{urls:['https://vimeo.com/123456','https://example.com/a-long-reference-path/visual-lighting-and-composition-notes'],onRemove:()=>{}}};
