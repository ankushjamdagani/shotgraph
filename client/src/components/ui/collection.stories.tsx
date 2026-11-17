import { AsciiArt } from './ascii-art';
import { getDefaultStartAppearance } from './page-background';
import { CollectionSort, type CollectionSortValue } from './collection-sort';
import { ProjectNameCue } from './collection';
import { startPanelBackgrounds, getStartPanelBackground } from '../../dev/start-panel-backgrounds';
import { ProjectStartPanel } from './project-start-panel';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { getPageBackground } from './page-background';
import { getCollectionLayout, getCollectionListStyle, getCardHoverStyle } from './collection-appearance';
import { cn } from './cn';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { SegmentedControl } from './segmented-control';
import { Input } from './input';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { Thumbnail, Table, TableHead, TableCell, TableRow } from './collection';
import { InlineRename } from './inline-rename';
import { Badge, NewItemIndicator } from './badge';
import { Button } from './button';
const meta = { title: 'Patterns/Collections' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Cards: Story = {
  render: () => (
    <div className="grid w-[min(760px,80vw)] grid-cols-2 gap-6">
      <article className="group">
        <Thumbnail>
          <Plus className="size-7 text-text-muted" />
        </Thumbnail>
        <h3 className="mt-4 text-sm font-semibold">New Project</h3>
        <p className="mt-2 text-xs text-text-muted">Start with a brief</p>
      </article>
      <article className="group">
        <Thumbnail>
          <span className="text-sm text-text-muted">Project preview</span>
          <NewItemIndicator />
        </Thumbnail>
        <h3 className="mt-4 text-sm font-semibold">Summer film</h3>
        <p className="mt-2 text-xs text-text-muted">9:16 · 00:30 · 30 FPS</p>
      </article>
    </div>
  ),
};
export const Rows: Story = {
  render: () => (
    <div className="w-[min(760px,80vw)]">
      <Table>
        <thead>
          <tr>
            <TableHead>Project</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Last opened</TableHead>
          </tr>
        </thead>
        <tbody>
          {['Summer film', 'Product demo'].map((name, i) => (
            <TableRow key={name}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Thumbnail compact>
                    {i === 0 && <NewItemIndicator side="left" small />}
                  </Thumbnail>
                  {name}
                </div>
              </TableCell>
              <TableCell>9:16 · 00:30 · 30 fps</TableCell>
              <TableCell>Just now</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  ),
};
export const Editing: Story = {
  render: function Editing() {
    const [editing, setEditing] = useState(false),
      [value, setValue] = useState('Summer film');
    return (
      <div className="w-80 space-y-4">
        <div className="relative flex h-6 items-center">
          {editing ? (
            <InlineRename
              value={value}
              onChange={setValue}
              onSave={() => setEditing(false)}
              onCancel={() => {
                setValue('Summer film');
                setEditing(false);
              }}
            />
          ) : (
            <span className="text-sm font-semibold">{value}</span>
          )}
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Rename
        </Button>
        <Button variant="ghost">Outside editor</Button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Rename' }));
    await expect(
      c.getByRole('textbox', { name: 'Project name' }),
    ).toHaveFocus();
    await userEvent.click(c.getByRole('button', { name: 'Outside editor' }));
    await expect(c.queryByRole('textbox')).not.toBeInTheDocument();
  },
};
export const Badges: Story = {
  render: () => (
    <div className="flex gap-3">
      <Badge>Active</Badge>
      <Badge>9:16</Badge>
      <Badge>30 FPS</Badge>
    </div>
  ),
};

export const FramedWelcome: Story = {
  render: function FramedWelcome() {
    const look = getCollectionLayout();
    const [sort, setSort] = useState<CollectionSortValue>({by: 'opened', direction: 'desc'});
    const split = true;
    return <div className="w-[min(1500px,90vw)] space-y-5">
      <div style={getPageBackground()} className={cn('flex min-h-[600px] flex-col bg-app text-text-primary',look.root)}>
        {split && <ProjectStartPanel onCreate={() => {}} onOpenFolder={() => {}} theme={<Button variant="ghost">Theme</Button>}/>}
        <main className={cn("min-w-0 flex-1",look.main)}>
        <div className={cn('shrink-0 border-b border-transparent',look.panel)}>
          <header className={cn('flex flex-wrap items-center justify-between gap-4 px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-9',look.header,split && 'lg:contents')}>
            <h2 className={cn("text-3xl font-semibold",look.title,split && "sr-only")}>Projects</h2>
            <div className={cn('flex items-center gap-2',look.actions,split && 'lg:hidden')}><Button>New Project</Button><Button variant="ghost">Open Folder</Button></div>
          </header>
          <div className={cn('flex flex-nowrap items-center justify-between gap-3 px-5 pb-5 sm:px-8',look.toolbar,split && 'lg:pt-6')}>
            <Input borderTone="subtle" aria-label="Search projects" placeholder="Search projects…" className="min-w-0 max-w-[340px]"/>
            <CollectionSort value={sort} onChange={setSort}/><SegmentedControl label="Project view" value="grid" onValueChange={() => {}} options={[{value:'grid',label:'Grid view',content:<LayoutGrid/>},{value:'list',label:'List view',content:<List/>}]} className="shrink-0"/>
          </div>
        </div>
        <div className={cn('flex-1 p-5 sm:p-8',look.results)}>
          <div className={cn('grid',look.grid)}>{['New Project','Summer film','Product demo','Launch film','City portrait','First cut'].map((name,i) =>
            <article key={name} className={cn("group min-w-0",look.card)}><button className="block w-full text-left"><Thumbnail className={look.thumbnail}>{i === 0 ? <Plus/> : <span className="text-sm text-text-muted">Project preview</span>}</Thumbnail></button>
              <div className={look.details}><h3 className="truncate text-sm font-semibold">{name}</h3><p className="mt-2 text-xs text-text-muted">{i === 0 ? 'Start a project' : '9:16 · 00:30 · 30 FPS'}</p></div>
            </article>)}</div>
        </div>
        </main>
      </div>
    </div>;
  },
};

export const WelcomeBackgrounds: Story = {
  render: () => {
    const [choice, setChoice] = useState<string>('36 · ASCII living meadow');
    return <div className="w-[min(1100px,90vw)]">
      <div className="mb-4 flex flex-wrap gap-2">
        {startPanelBackgrounds.map(option => <Button key={option} variant={option === choice ? 'primary' : 'secondary'} onClick={() => setChoice(option)}>{option}</Button>)}
      </div>
      <div className="flex h-[650px] [&>section]:m-0 [&>section]:flex [&>section]:basis-full">
        <ProjectStartPanel onCreate={() => {}} onOpenFolder={() => {}} style={getStartPanelBackground(choice)} />
      </div>
    </div>;
  },
};

export const QuietRows: Story = {
  render: () => {
    return <div className="relative isolate h-[650px] w-[min(900px,85vw)]" style={getPageBackground()}>
      <div className={cn('h-full overflow-y-auto bg-transparent', getCollectionListStyle())}>
        <Table className="table-fixed"><tbody>
          {['New Project', ...Array.from({length: 14}, (_,index) => 'Film study ' + (index+1))].map((title, index) =>
            <TableRow key={title}>
              <TableCell><div data-list-content className="flex items-center gap-2">
                <Thumbnail compact intent={index === 0 ? 'create' : 'open'} data-list-thumb><Plus className="size-4 text-text-muted"/></Thumbnail>
                <div data-list-text className="min-w-0"><button data-project-name className="flex items-center gap-2 text-sm font-semibold">{title}<ProjectNameCue/></button>
                  <div data-list-meta className="mt-1 text-xs text-text-muted">{index === 0 ? 'Start with a brief' : '16:9 · 00:30 · 30 fps · 2h ago'}</div>
                </div>
              </div></TableCell>
              <TableCell className="w-44"><Button variant="ghost" className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">{index === 0 ? 'Create' : 'Open'}</Button></TableCell>
            </TableRow>
          )}
        </tbody></Table>
      </div>
    </div>;
  },
};

export const CardHovers: Story = {
  render: () => {
    return <div className="w-[min(900px,85vw)] space-y-6">

      <div className={cn("grid grid-cols-2 gap-6")}>{['New Project','Summer film'].map(title=><article key={title} className={cn('group',getCardHoverStyle())}><button className="block w-full text-left"><Thumbnail intent={title === 'New Project' ? 'create' : 'open'}><svg viewBox="0 0 300 160" className="size-full"><path d="M60 80h180" stroke="var(--border-focus)"/><rect x="25" y="65" width="70" height="30" rx="4" fill="var(--bg-card)" stroke="var(--border-subtle)"/><rect x="205" y="65" width="70" height="30" rx="4" fill="var(--bg-card)" stroke="var(--border-subtle)"/></svg></Thumbnail><span data-project-name className="mt-3 flex items-center gap-2 text-sm font-semibold">{title}<ProjectNameCue/></span><span data-card-meta className="mt-2 block text-xs text-text-muted">9:16 · 00:30 · 30 FPS</span></button></article>)}</div>
    </div>;
  },
};

/** Soft content protection for full-page creation, distinct from the listing panel. */
export const SoftArtworkExclusions: Story = {
  render: () => <div className="relative isolate flex min-h-[650px] w-[min(1000px,85vw)] items-center justify-center overflow-hidden" style={getPageBackground()}>
    <AsciiArt appearance={getDefaultStartAppearance()} exclusionStyle="soft"/>
    <div data-art-exclusion className="max-w-md p-6"><h2 className="text-3xl font-semibold">Start with an idea.</h2><p className="mt-6 text-xl text-text-muted">The artwork fades around content without a rectangular cut.</p></div>
  </div>,
};
