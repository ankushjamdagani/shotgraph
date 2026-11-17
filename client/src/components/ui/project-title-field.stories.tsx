import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ProjectTitleField, projectTitleVariants } from './project-title-field';
const meta={title:'Inputs/Project title',component:ProjectTitleField} satisfies Meta<typeof ProjectTitleField>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Placements:Story={args:{value:'',onChange:()=>{}},render:function Example(){const [value,setValue]=useState('');return <div className="w-[min(650px,85vw)] space-y-8">{projectTitleVariants.map(variant=><section key={variant}><h2 className="mb-3 text-xs text-text-muted">{variant}</h2><ProjectTitleField value={value} onChange={setValue} variant={variant}/></section>)}</div>;}};
