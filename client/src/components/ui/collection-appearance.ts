import { getGalleryInteraction } from './collection-hover';
/** Approved Projects composition, shared by the app and Storybook. */
export const framedWelcomeCollection = {
  root: 'lg:flex-row',
  main: '',
  panel: 'bg-transparent',
  title: 'sm:text-3xl',
  header: '',
  actions: '',
  toolbar: 'pb-2 sm:px-6 sm:pb-2',
  filters: '',
  search: '',
  results: 'min-w-0 pt-2 sm:px-6 sm:pt-2',
  grid: 'grid-cols-1 gap-x-6 gap-y-7 md:grid-cols-2',
  card: '',
  thumbnail: 'h-thumbnail',
  compact: '',
  details: 'pt-3',
  metadata: 'gap-x-4',
  list: 'border-0 bg-transparent shadow-none [&_table]:bg-transparent [&_tbody]:bg-transparent [&_td]:bg-transparent',
};
export function getCollectionLayout() { return framedWelcomeCollection; }

export function getCollectionListStyle() {
  return '[&_td]:px-4 [&_td]:py-4 [&_[data-list-content]]:gap-3';
}


export const getCardHoverStyle = getGalleryInteraction;
