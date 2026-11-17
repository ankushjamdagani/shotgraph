import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ProjectTitleField } from './project-title-field';
const meta={title:'Inputs/Project title',component:ProjectTitleField} satisfies Meta<typeof ProjectTitleField>;
export default meta;
type Story=StoryObj<typeof meta>;
export const AboveIdea:Story={args:{value:'',onChange:()=>{}},render:function Example(){const [value,setValue]=useState('');return <div className="w-[min(650px,85vw)]"><ProjectTitleField value={value} onChange={setValue}/></div>;}};
