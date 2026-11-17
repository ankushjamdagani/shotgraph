# Create-project design-system review

Reviewed against `client/AGENTS.md`, `client/DESIGN.md`, the current wizard, shared UI implementations and colocated Storybook examples.

## Result

The flow is composed from shared controls and task patterns. This update promotes the approved composition into `client/src/components/ui/setup-defaults.ts`, consumed by production state, development comparisons/Reset and the Approved defaults story. Production no longer depends on Leva or restored visual experiments to obtain the approved appearance.

Approved: Quiet focus, compact form width, Cover flow options, no progress indicator, Original paragraph story content, Story spread layout, Compact header and Soft inputs on the original `bg-card` background. The existing Split footer remains in use inside Quiet focus’s viewport-bottom footer panel.

General creation and folder-picker failures now use the shared toast service. Caller-owned API error feedback prevents duplicate notifications. Engine/story recovery stays contextual. Error submission retains inputs and re-enables actions.

## Custom component inventory

| Responsibility | Components | Scope |
| --- | --- | --- |
| Shell | SetupFlow, SetupHeader, SetupActions | Reusable task-flow patterns; structural comparisons remain available |
| Controls | Input, Textarea, Label, Button, IconButton, ChoiceGroup, StepIndicator | Shared semantic controls; SetupInputContext applies the setup-specific input treatment |
| Story selection | StoryDeck, StoryContent | Creation-specific selection and concept presentation; Radix single-select behavior |
| Mood/look selection | MoodPicker, LookPicker, VisualChoiceList | Domain wrappers over a shared visual selection collection |
| Project details | ProjectTitleField, ProjectSettingsFields, SetupReview | Creation-specific field and review patterns |
| References | ReferenceLinks | Reusable bordered reference links with independent removal |
| Background/feedback | AsciiArt, page-background, Toaster, toastService | Shared rendering and appearance infrastructure |
| Orchestration | NewProjectWizard | Step state, draft restoration, engine requests, validation and submission |
| Independent shortcut | EmptyProjectAction | Floating skip-setup action outside the form footer |
| Comparisons | VisualListTools | Lazily loaded DEV-only Leva tooling |

These components live in `client/src/components/ui/` except NewProjectWizard (`components/project`), VisualListTools (`dev`) and toastService (`services`). Location in `ui/` does not make a domain component a universal primitive.

## Remaining boundaries

- The wizard still owns inline loading/error/retry markup and its step composition. Extract a reusable status pattern when a second reviewed screen needs it; no additional component is required simply to relocate markup.
- StepIndicator is the shared navigation component; the unused SetupProgress component and its story have been removed.
- VisualChoiceList still contains decorative gradient colors and fine print sizing specific to option artwork. These have not been promoted to app-wide semantic tokens. They should remain scoped to artwork until approved as a reusable visual recipe.
- Comparison variants are retained for review, not all declared approved design-system directions. The defaults file and Approved defaults story distinguish the supported composition from experiments.
- Generic component fallback props remain generic. The approved new-project appearance is an explicit composition, so other screens do not change incidentally.

## Verification

Type checking, application and Storybook builds; creation regression coverage including duplicate-folder feedback and retained input; desktop dark and mobile light inspection of the approved preset and toast visibility.

The flow is now Brief → Story → Mood → Look → Review. Format and duration are separate Review selections, with general extra instructions below. The empty-project action is independent of guided navigation.

Brief now contains only the idea/reference input. Project title and folder editing are in Review. The title derives from the selected story until explicitly edited, and custom titles/paths persist through story changes and draft reloads.

Framed canvas is now the approved primary idea-input default. Original and the other requested comparisons remain available in DEV controls. Removed obsolete progress scaffolding, unbound input refs, duplicate comparison callbacks and redundant draft fields.
