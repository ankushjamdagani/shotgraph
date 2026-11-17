import type { Meta, StoryObj } from '@storybook/react-vite';
import { SetupActions } from './setup-actions';
const meta={title:'Patterns/Setup actions',component:SetupActions} satisfies Meta<typeof SetupActions>;
export default meta;
type Story=StoryObj<typeof meta>;
export const QuietSplit:Story={args:{back:true,blank:true,primary:'Continue',onBack:()=>{},onBlank:()=>{}},render:args=><form className="w-[min(760px,85vw)]" onSubmit={event=>event.preventDefault()}><SetupActions {...args}/></form>};
