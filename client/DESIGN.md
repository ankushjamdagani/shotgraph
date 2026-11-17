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

Creation is a full-screen Radix dialog on Warm Stock. The approved Quiet focus composition uses a compact column (832px maximum); development controls can compare balanced, wide and full widths without persisting experiments. The header contains branding and close. Only the middle content scrolls; the full-width body footer stays flush with the viewport bottom and wraps on narrow screens. ASCII artwork ends above the footer.

The visible order is Brief → Story → Mood → Look → Review. Brief contains the idea and reference links only. The selected story supplies the default project title and folder name. Review exposes the editable title, folder picker/manual path, format, duration and optional general instructions. A manually edited title remains stable when stories change; unedited titles follow the active story. Entering creation starts a real structured-response connection test for the configured supported engine in the background. Leaving Brief waits when the test is pending, with retry on failure. Story generation begins after that check. Format and duration are edited independently in Review, followed by an optional general Custom prompt. Changing these settings does not regenerate the chosen story. Mood analysis uses the selected story. Verification is never restored from a saved draft. Closing the wizard discards its draft and cancels pending requests; reopening starts fresh. Drafts restore input and the current step on direct reload at `/projects/new`; the listing stays hidden while the wizard loads.

Story spread is the approved story layout; Cover flow is the approved mood/look option layout. Story choices are complete story panels in a Radix single-select horizontal collection. Comparisons are Editorial carousel, Screenplay deck, Filmstrip, Story spread, Focus stage and Story gallery; each changes the full story composition. There is one Story layout control, with no separate switcher experiments. Previous/next controls cycle the selected story; adjacent full story panels provide context. The selected panel determines the stage height, with no nested story scrollbar. The custom-direction alternate replaces the collection while writing. Restored drafts normalize older multiple selections to one story; custom directions replace the active selection. Mood context, Look, Review and submission all consume the chosen story, and guided submission requires one valid story. Mood and Look cards support explicit arrow buttons, keyboard selection and touch swipes. Wheel scrolling never changes the selected card. Editable custom text keeps normal spaces and cursor movement. Custom story directions have an explicit Add direction action. Suggestions remain optional and never replace a user's mood selection.

Progress is hidden by default (None); comparisons include Counter, Breadcrumb, Track and Chapters. Footer comparisons are Split (approved), Stacked, Toolbar and Minimal. Development Leva controls expose these alongside card layout and width. The floating Skip setup / Create empty project shortcut is outside the form and its footer actions; it remains available during story generation and disables during submission. There is no setup reset action. Header comparisons are Brand, Compact (approved, step context) and Framed. Quiet focus shows Shotgraph without an adjacent New project label. Text inputs default to Soft on bg-card; comparisons include Plain, Outlined, Underline, Inset and Editorial consistently across title, brief, notes and custom story/mood/look fields. Empty libraries compare Invitation, Workspace and Minimal; search misses remain distinct. Horizontal mood and look rails use up to 1240px of viewport width, independent of the form column. Rails have no side fades and reserve vertical space for transformed cards. Custom mood/look inputs sit below the presets as alternatives, never as cards. Visual does not repeat the story title. Keep the primary Continue/Create action prominent.

Reference links use shared bordered previews with a link icon, host, path, open cue and independent remove action. Links open in a new tab. Creation success owns the editor handoff and must not invoke the cancellation callback. Errors retain user input. Shared progress, footer and reference-link stories cover the comparison variants in both themes.

Story ideation generates short prose concepts (premise, subject, tension and emotional promise), not timed beats, scenes or a screenplay. The chosen concept is preserved in the created Idea node; scene structure and timing belong to the later script stage.

Story content is compared independently of Story layout: Original paragraph (retained default), Hook + three lines, Pitch card, Progressive detail, Highlight the difference, and Concept + reference image. AI suggestions include concise subject/tension/payoff, pitch and distinguishing idea fields alongside the original prose. Older drafts gracefully fall back to supplied prose. Read full concept toggles detail outside the story radio button. Reference-image attachments are local preview comparisons and are not persisted as project assets.

The development-only Flow structure control compares Original (retained comparison), Aligned bands, Framed workspace and Quiet focus for vertical composition; Chapter rail, Split introduction and Action rail restructure the desktop shell. Chapter rail places step navigation on the left, Split introduction places the active heading and navigation beside the form, and Action rail places progress and actions on the right. Below the large breakpoint these structures stack with visible navigation and accessible actions. All variants share one content tree, preserve form values when switched, and keep content scrolling independently of the actions. The separate Header, Footer and Form width controls remain available for comparisons. Storybook Patterns/Setup flow covers each structure in both themes.

Additional split comparisons retain step information and the step list on the left, with form content and actions on the right: Split anchored separates the introduction from bottom-aligned navigation; Split sidebar uses a distinct navigation surface and active rows; Split workspace frames the right pane while leaving the introduction outside; Split open removes desktop dividers and uses a spacious bounded composition; Split compact narrows the left pane to prioritize the form. They share the existing stacked mobile adaptation and keep Split introduction available. The row navigation treatment is a shared StepIndicator appearance, independent of its progress variant.

Quiet focus places its actions in a full-width body footer, flush with the viewport bottom and outside the padded content column. Its ASCII layer belongs to the body region above that footer, so the art ends at the panel boundary. The header retains Shotgraph branding without the adjacent New project label. Other shell variants retain their existing footer placement and branding.


## Approved creation preset and component ownership

`src/components/ui/setup-defaults.ts` is the typed source for the production wizard, development controls and Approved defaults Storybook example. Approved values are Quiet focus / compact width / Cover flow / None progress / Original paragraph / Story spread / Compact header / Soft inputs. The footer retains Split. Reset in the development panel returns to this preset. Comparison values stay development-only and are not written to drafts; draft restoration preserves project inputs, not visual experiments. Individual component fallback props remain generic; consumers compose the approved creation preset explicitly.

General creation failures (including an existing project folder), connection failures during submission and native folder-picker failures use `toast.error` through the shared Sonner Toaster. They preserve inputs and allow retry. Field/selection validation and recoverable story-generation or engine-check errors remain beside the affected step, with their existing recovery action.

Custom components are organized by responsibility, rather than every component in `ui/` being a universal primitive:

| Layer | Components | Responsibility |
| --- | --- | --- |
| Shared controls | Button / IconButton, Input / Textarea / Label, ChoiceGroup, StepIndicator, Select, SegmentedControl | Reusable controls, semantic tokens, Radix behavior where interactive primitives apply |
| Shared task patterns | SetupFlow, SetupHeader, SetupActions, ReferenceLinks | Shell regions, navigation/action placement, reference-link presentation |
| Creation domain patterns | ProjectTitleField, ProjectSettingsFields, EmptyProjectAction, StoryDeck, StoryContent, MoodPicker, LookPicker, SetupReview | Project-specific content and selection; MoodPicker and LookPicker share VisualChoiceList |
| Shared visual infrastructure | AsciiArt, page-background, Toaster | Procedural artwork, Warm Stock appearance, Sonner feedback |
| Screen orchestration | NewProjectWizard | Drafts, requests, validation, step transitions and creation payload |
| Development tooling | VisualListTools | Lazy DEV-only comparisons; no production dependency on Leva |

Each shared pattern has colocated Storybook coverage; Patterns/Setup flow → Approved defaults demonstrates the promoted shell and input treatment in both themes. Existing comparison stories remain review tools. NewProjectWizard still contains the step composition and some inline status/recovery markup; these are screen-specific, not new design-system primitives. StepIndicator is the shared navigation component; the unused legacy SetupProgress component and its story have been removed.

The API transport supports caller-owned error feedback (`errorToast: false`); creation uses this for submission, folder picking and contextual AI recovery so the API layer and wizard do not emit duplicate toasts. Other callers retain automatic mutation error toasts.

Review settings use the shared ProjectSettingsFields pattern: separate Format and Duration radio groups, then an optional Custom prompt with reference links. Extra instructions are retained in the creation payload and the Idea node’s text/metadata. Older drafts paused on the removed Format step reopen at Brief with their values preserved.

The main brief uses ProjectIdeaInput, a dedicated primary-input pattern with no visible Description label and an accessible Project idea name. Its DEV-only Idea input comparisons are Framed canvas (approved default), Original (retained comparison), Open canvas, Editorial page, Focus prompt and Compact composer; these are independent of the smaller setup-field treatments. All variants preserve the same value, reference-link extraction and helper text. Step headings and content center together vertically when they fit; taller content begins at the top of the scroll region, keeping the body footer fixed. Split compositions retain their introduction in the left pane and center the right-hand content.
