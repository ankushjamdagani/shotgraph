# Shotgraph design system

The approved Projects listing is the visual reference for future screens. This is an incremental system: reuse its language, then extend it as each screen is reviewed. Do not restyle unreviewed editor screens incidentally.

## Source of truth

| Concern | Implementation |
| --- | --- |
| Theme, color, size, radius and motion tokens | `src/styles/tokens.css` |
| Tailwind token mappings and named animations | `tailwind.config.js` |
| Reusable controls and colocated stories | `src/components/ui/` |
| Collection layout and hover recipes | `collection-appearance.ts`, `collection-hover.ts` |
| Welcome composition and procedural artwork | `project-start-panel.tsx`, `ascii-art.tsx` |
| Notifications | `toaster.tsx` (Sonner, shared by app and Storybook) |
| Development tuning | `src/dev/ProjectDesignTools.tsx` (Leva) |

Use Radix primitives for keyboard behavior, focus management, menus and dialogs. Style through Tailwind, CVA variants and semantic tokens; use `cn` to merge classes. Do not introduce another component framework, notification renderer or page-specific control override.

## Approved visual language

**Warm Stock** is the shared flat page/panel ground: the theme's app color mixed with 5% warm stock (#bda788). Paper & Ink uses charcoal text on white-derived surfaces; Film Lab uses light text on black-derived surfaces. Keep controls, branding, project creation tiles and typography neutral. Saturated color belongs to semantic feedback and the decorative **Cobalt Signal** ASCII gradient, not CTA fills or full-page washes.

Use Plus Jakarta Sans for UI and JetBrains Mono for technical data and ASCII. Use a 4px spacing rhythm with 2px adjustments inside compact controls. Standard UI text is 14px; supporting metadata and compact controls are 12px. The welcome heading scales from 30px to 48px. Important content must remain readable rather than shrinking to fit.

| Element | Approved value |
| --- | --- |
| Small / standard / large controls | 28 / 34 / 40px, including icon buttons |
| Control / thumbnail / dialog radius | 6 / 12 / 16px |
| Gallery preview height | 200px |
| Gallery column / row gap | 24 / 28px |
| Quiet row padding | 16px horizontally and vertically |
| Toolbar-to-results gap | 16px |
| Focus ring | 1px with 1px offset |

Borders are 1px. Projects search, theme/design controls, view switch, secondary actions, thumbnails, panel frames and dialog Cancel use `border-subtle`; `Button` and `Input` expose `borderTone="subtle"`. General forms retain `border-control` where a stronger boundary is needed. Focus and error borders use their semantic tokens. Do not add local border colors to solve inconsistencies.

## Components and behavior

- **Button / IconButton:** primary, secondary, ghost, quiet and destructive variants. Use standard sizes; accessible labels are required for icon-only controls. Primary actions stay neutral. Loading prevents duplicate submission.
- **Input / Textarea / Label:** connect labels and error descriptions. Search suppresses native appearance. Use `aria-invalid` for errors.
- **Checkbox / Switch / Select / SegmentedControl:** Radix behavior; segmented controls provide roving keyboard focus. Grid/list controls use the same border family as search.
- **DropdownMenu / CollectionSort:** accessible radio groups separate sort field (last opened, created, name) from direction. Compact trigger shows the current sort. Creation items remain pinned first.
- **Dialog / AlertDialog:** use dialogs for focused tasks and alerts for consequential confirmation. Delete uses **Paper Veil**: 85% app-color overlay with 2px blur. Explain what will be moved to Trash and recovery limits. Cancel comes first; keep the dialog open while awaiting the result and restore focus on close.
- **InlineRename:** edit in the existing fixed-height title slot. Enter saves; Escape or blur cancels. Editing must not shift adjacent content.
- **Thumbnail / Table / ProjectNameCue:** transparent bordered previews, plain rows and a shared Preview Veil interaction. Keep names truncated and actions independent of the full-card/row opening target.
- **NewItemIndicator:** notification-blue marker at card thumbnail top-right or list thumbnail top-left. Animate briefly and remove after six seconds; never persist it.
- **Toaster:** Sonner at bottom right, close control inside the body on the right. Match surface, subtle border, dialog radius and compact typography; descriptions remain clearly readable. Report rename/copy/delete success only after completion; errors must be visible. Preserve Undo where supported.

## Collection composition

The approved desktop composition is **Split · Framed welcome**: a broad framed left panel occupies 36% of width; the right pane owns search, compact sort and grid/list controls. No visible Projects heading, aspect filters, count, footer or sidebar. Narrow layouts retain creation actions above the collection.

The left panel places branding and theme at the top. The introduction sits slightly above center, with New Project and Open Folder below it. Living Meadow is the default ASCII scene; frame-by-frame character motion and a changing Cobalt Signal gradient give the neutral page life. Keep artwork out of content bounds with 20px breathing room. Panel and page share the same base ground. Do not reintroduce body linework or page gradients.

Grid uses one column on small screens and two from medium widths. List uses **Quiet rows**: thumbnail/name/metadata plus hover actions, no column headings, surface fill, enclosing shadow or frame. Both views include a fully clickable New Project item first when matching results exist. With no results, show No matches found and retain creation actions outside the collection.

## Interaction and motion

**Preview Veil** is the only collection hover treatment: preview media recedes to 10% opacity, a plain Open/Create cue appears, the title gains subtle tracking and a small arrow, and metadata gains contrast. Apply it to existing projects and New Project in both views. Do not add thumbnail fills, contrasting action pills, lift, tilt, pan or zoom on hover. Keyboard focus provides the same cue; quick actions remain available on touch.

Use shared durations: fast 150ms, normal 240ms. Collection reorder uses FLIP at 240ms. New cards zoom in over 520ms; rows use a smaller 340ms entrance. Deletion fades before reflow without horizontal translation or transient horizontal scroll. Reserve scroll gutter and fixed title height. Honor reduced motion for transitions and artwork; pause artwork while the document is hidden.

## Storybook and verification

Run `npm run storybook` (localhost:6006). Use the global Paper & Ink / Film Lab theme selector. Foundations shows current semantic tokens; Patterns/Collections covers the framed welcome, quiet rows, hover and inline editing. Navigation covers sorting; Overlays covers Paper Veil and real Sonner feedback with dummy data. Stories must not access production projects.

For shared changes run `npm run check`, `npm run build`, and `npm run build-storybook`. Check relevant pointer, keyboard, empty, loading/error and long-title states in both themes. `node client/scripts/check-contrast.mjs` checks primary/muted text and strong control/focus boundaries against theme surfaces. Subtle decorative borders are intentionally quieter and are not a claim of 3:1 control-boundary contrast; controls also need clear labels and visible keyboard focus.

## Extending the system

1. Read this guide and find an existing component/story before adding UI.
2. Reuse semantic tokens and approved recipes. Add a variant only for a real repeated need.
3. Add stories for new shared behavior and relevant states in both themes.
4. Record approved decisions here; remove rejected experiments instead of appending a review history.

Leva is development-only, lazily imported behind `import.meta.env.DEV`, with a scoped store and Reset. Retained left-art comparisons are review tools, not additional production design directions. Approved defaults must work without the debugger. Do not persist experimental settings.

Custom CSS is limited to semantic tokens, legacy editor styles, Sonner integration and effects not reasonably expressed by utilities. Procedural ASCII geometry/content exclusions and collection FLIP coordinates are behavior-specific exceptions. Keep reusable motion in named Tailwind animations. Existing legacy CSS is not precedent for new screens.

## Project creation

Creation uses a full-screen Radix dialog on Warm Stock, a compact brand/close header, and named setup steps (Brief, Format, Mood, Engine, Story, Look, Review). The form is centered within a single readable column, with a matching header alignment and a named seven-step progress track above the form. There is no left rail. The shared Cobalt Signal meadow artwork lives around the content; header and form have protected exclusion zones. Completed steps are revisitable. Keep the primary form at a readable width and use neutral shared controls throughout.

ChoiceGroup is the shared Radix radio-card pattern for format, duration, engine, mood and look. Selected choices use a 1px focus-color border and checkmark without layout shift. Every field has an explicit label. Blank creation remains available through setup and generation; AI failures offer retry and manual input. Review presents actual selected settings. Disable duplicate creation and closing during submission; retain inline errors and user input on failure.

Creation begins with a large, borderless idea editor. Project title is independent from the idea; an empty title falls back to Untitled Video Project. Above idea is the approved title placement; Description has a matching visible label. Save location shows the actual server default target path with Change folder; there is no manual path editor. Input and Textarea expose a shared plain variant; preserve explicit accessible labels and visible caret. Quiet split is the approved SetupActions footer. Removed rejected variants and their development controls.

Creation art uses feathered SVG exclusion masks around individual content groups instead of cutting a rectangular hole around the full form. The listing retains its original hard content protection. The first-step description is visually hidden because the editor placeholder provides the visible guidance.

Creation progress and footer occupy stable positions across steps. Only the middle content region scrolls; the compact action region reserves 64px on desktop and 112px on narrow screens, avoiding a blank spacer above the buttons. SetupProgress uses a text/stroke hover without a filled tile and preserves keyboard focus. Title and footer comparison controls are removed after approval.

Plain inputs retain 12px horizontal padding; plain textareas add 8px vertical padding. Step descriptions stack below their titles; Brief and Format omit visible descriptions. Format uses a multiline Creative notes field with examples. MoodPicker provides six immediate presets and a separate idea-based suggestion card with loading, retry and unavailable states. Suggestions never overwrite a chosen mood or notes and require an explicit Use this mood action.

Selection uses a primary-ink border plus 1px ring, card fill and a checkmark without changing geometry. Mood suggestions, preset radios, story cards and visual looks share this treatment. Engine setup only selects a runner; directing prompt input is removed.

StoryDeck presents the initially selected/recommended direction in front, with alternate cards fanned behind. Previous/next and named preview controls expose every direction; previewing does not change selection. Each direction retains its independent checkbox. LookPicker uses local style reference images with clear titles and descriptions; these are illustrative references, not generated project frames. Image sources live beside the assets.

SetupProgress retains Named track in production. Development-only Leva controls compare Named track, Numbered stops, Compact chapters and Progress ribbon in the same fixed-height panel. Reset restores Named track. Stories cover all choices in both themes.
