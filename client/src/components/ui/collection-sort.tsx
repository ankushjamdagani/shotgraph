import { ArrowDownWideNarrow, ArrowUpNarrowWide, Clock3, CalendarDays, CaseSensitive, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './button';
import { Tooltip } from './tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from './dropdown-menu';
export type CollectionSortValue = { by: 'opened' | 'created' | 'name'; direction: 'asc' | 'desc' };
export function CollectionSort({value,onChange}:{value:CollectionSortValue;onChange:(value:CollectionSortValue)=>void}) {
  const alphabetical = value.by === 'name';
  const label = alphabetical ? (value.direction === 'asc' ? 'Name A–Z' : 'Name Z–A') : value.by === 'opened' ? (value.direction === 'desc' ? 'Recent' : 'Earlier') : 'Created';
  const order = alphabetical ? ['A–Z','Z–A'] : ['Oldest first','Newest first'];
  const SortIcon = value.direction === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow;
  const description = 'Sort by ' + (value.by === 'opened' ? 'last opened' : value.by === 'created' ? 'date created' : 'project name') + ' · ' + (value.direction === 'asc' ? order[0] : order[1]);
  return <DropdownMenu>
    <Tooltip label={description}>
      <DropdownMenuTrigger asChild><Button variant="secondary" borderTone="subtle" aria-label="Sort projects" className="gap-2 px-2.5"><SortIcon/><span>{label}</span></Button></DropdownMenuTrigger>
    </Tooltip>
    <DropdownMenuContent align="end" className="w-56">
      <p className="px-3 pb-1 pt-2 text-xs font-medium text-text-muted">Sort by</p>
      <DropdownMenuRadioGroup value={value.by} onValueChange={by=>onChange({by:by as CollectionSortValue['by'],direction:by === 'name' ? 'asc' : 'desc'})}>
        <DropdownMenuRadioItem value="opened"><Clock3/>Last opened</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="created"><CalendarDays/>Date created</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="name"><CaseSensitive/>Project name</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator/>
      <p className="px-3 pb-1 pt-1 text-xs font-medium text-text-muted">Order</p>
      <DropdownMenuRadioGroup value={value.direction} onValueChange={direction=>onChange({...value,direction:direction as CollectionSortValue['direction']})}>
        <DropdownMenuRadioItem value="asc"><ArrowUp/>{order[0]}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="desc"><ArrowDown/>{order[1]}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
