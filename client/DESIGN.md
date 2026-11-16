# Studio UI system — incremental baseline

The approved Projects screen is the starting point. This is a small working system, not a complete specification. Expand it during screen reviews.

## Stack and locations

- **Radix UI Primitives:** accessible interactions, focus, keyboard navigation and portals.
- **Tailwind + CVA:** component styles and explicit variants.
- **Sonner:** notifications, bottom right, close button inside the right edge.
- **Lucide:** icons.
- `src/components/ui/`: shared components and colocated stories. Import from its barrel or a component file.
- `src/styles/tokens.css`: semantic theme values.
- `tailwind.config.js`: token mappings, control sizes, named motion.
- `.storybook/`: Storybook configuration and global light/dark toolbar.

Run `npm run storybook` from the repository root; open http://127.0.0.1:6006. Build the static catalogue with `npm run build-storybook`.

## Visual baseline

Paper & Ink is white with charcoal text. Film Lab uses black and neutral dark surfaces. Theme colours are semantic: app, surface, card, hover, text-primary, text-muted, danger, notification, row-hover. Never use primary text as a notification colour.

Plus Jakarta Sans is the UI font; JetBrains Mono is for measurements and technical data. Use a 4px spacing rhythm, with 2px adjustments inside compact controls. Default controls are 34px high, small controls 28px, large controls 40px. Icon buttons use the same sizes. Control radius is 6px, thumbnails 12px, dialogs 16px.

Typography: page title 36px on desktop / 30px on narrow screens; section title 20px; normal UI text 14px; compact controls and supporting text 12px. Do not shrink important controls below these sizes to make a layout fit.

## Components

- `Button`: primary, secondary, ghost, quiet, destructive; sizes sm/md/lg/icon/icon-sm. `asChild` uses Radix Slot. Loading disables interaction.
- `IconButton`: requires an accessible `label`; use `Tooltip` for contextual explanation.
- `Input`, `Textarea`, `Label`: pair visible labels with IDs; use `aria-invalid` and `aria-describedby` for errors.
- `Checkbox`, `Switch`, `Select`: Radix interactions with Tailwind styling.
- `SegmentedControl`: single selection for filters and view controls; Radix provides roving keyboard focus.
- `Dialog`: focused tasks. `AlertDialog`: consequential confirmation, with Cancel first and focus restored when closed. Prevent automatic action-close while awaiting a server result.
- `DropdownMenu`: actions with keyboard navigation; destructive items use the danger token.
- `Badge`, `Separator`, `Thumbnail`, `Table*`: small compositional building blocks.
- `InlineRename`: fixed-height title slot, Enter saves, Escape or blur cancels. Buttons stay in the same focus group; no layout shift.
- `NewItemIndicator`: blue notification marker, card top-right / list thumbnail top-left. The parent removes it after six seconds; no storage.

## Interaction rules

Thumbnail backgrounds start transparent with a subtle border; hover/focus adds the hover surface. Cards do not lift or scale on hover. Quick actions appear on hover or keyboard focus, and remain visible on touch. New Project remains the first item in both views; New Project and Open Folder also live in the header.

Hover changes take 150ms. Reordering takes 240ms. A new card scales in over 520ms; a list row uses a smaller scale over 340ms. Deletion fades out before reflow, without horizontal translation. Respect prefers-reduced-motion. Keep rename stable and the scroll gutter reserved.

## Scope and CSS exceptions

Projects and ThemeToggle use the shared components. Other editor screens are legacy and migrate as reviewed. Their existing CSS is not precedent for new components.

Custom CSS remains for theme tokens, base/legacy editor styling, and Sonner's third-party close-button markup. Project graph geometry and collection FLIP animation require calculated coordinates; those are behavior-specific exceptions, not new control styles. Use named Tailwind keyframes for all reusable animation.

## Growing the system

Use an existing component first. Add a small variant for a repeated need, a new component when its interaction is reusable, and a Storybook example showing its states. Update this file when a design decision changes. Keep production data and API calls out of stories.
