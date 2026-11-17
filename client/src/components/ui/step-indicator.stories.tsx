import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StepIndicator, stepIndicatorVariants } from './step-indicator';
const meta = {title:'Patterns/Creation progress',component:StepIndicator} satisfies Meta<typeof StepIndicator>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Variants:Story={args:{steps:['Brief','Format','Story','Mood','Look','Review'],currentStep:3,furthestStep:4,onStepClick:()=>{}},render:function Example(args){const [current,setCurrent]=useState(args.currentStep);return <div className="space-y-8">{stepIndicatorVariants.map(variant=><div key={variant}><p className="mb-2 text-sm text-text-muted">{variant}</p><StepIndicator {...args} currentStep={current} onStepClick={setCurrent} variant={variant}/></div>)}</div>;}};
