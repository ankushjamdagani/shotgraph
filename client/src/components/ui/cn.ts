import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
// Register semantic utilities so explicit variant classes replace the baseline.
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      h: [{ h: ['control', 'control-sm', 'control-lg', 'thumbnail'] }],
      w: [{ w: ['control', 'control-sm', 'control-lg'] }],
      size: [{ size: ['control', 'control-sm', 'control-lg'] }],
      rounded: [{ rounded: ['thumbnail', 'dialog'] }],
      shadow: [{ shadow: ['dialog', 'preview', 'inset-panel'] }],
    },
  },
});
export function cn(...values: ClassValue[]) {
  return merge(clsx(values));
}
