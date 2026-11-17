import type { Meta, StoryObj } from '@storybook/react-vite';
import { SetupActions, setupActionVariants } from './setup-actions';
const meta={title:'Patterns/Setup actions',component:SetupActions} satisfies Meta<typeof SetupActions>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Variants:Story={args:{back:true,blank:true,primary:'Continue',onBack:()=>{},onBlank:()=>{}},render:args=><div className="w-[min(760px,85vw)] space-y-10">{setupActionVariants.map(variant=><section key={variant}><h2 className="mb-3 text-sm font-medium">{variant}</h2><form onSubmit={event=>event.preventDefault()}><SetupActions {...args} variant={variant}/></form></section>)}</div>};
