import type { Meta, StoryObj } from '@storybook/react-vite';
import { SetupActions } from './setup-actions';
const meta={title:'Patterns/Setup actions',component:SetupActions} satisfies Meta<typeof SetupActions>;
export default meta;
type Story=StoryObj<typeof meta>;
export const QuietSplit:Story={args:{back:true,blank:true,primary:'Continue',onBack:()=>{},onBlank:()=>{}},render:args=><form className="w-[min(760px,85vw)]" onSubmit={event=>event.preventDefault()}><SetupActions {...args}/></form>};
export const LayoutVariants:Story={args:QuietSplit.args,render:args=><div className="w-[min(800px,90vw)] space-y-10">{(['split','stacked','toolbar','minimal'] as const).map(variant=><form key={variant} onSubmit={event=>event.preventDefault()}><p className="mb-3 text-sm text-text-muted">{variant}</p><SetupActions {...args} variant={variant} onReset={()=>{}} middle={<span className="text-xs text-text-muted">2 / 6 · Format</span>}/></form>)}</div>};
