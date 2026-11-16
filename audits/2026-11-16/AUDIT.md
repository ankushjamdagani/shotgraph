# Visual AI Video Studio: audit and revamp plan

Date: 16 November 2026. Scope: functionality, behavior, and UI. Audit only; no application source changes.

## Decision

Keep the spatial studio concept, project hub, theme system, and version graph. Revamp the production workflow around reliable project state, real media, and truthful progress before investing in a visual redesign. The current app is a promising studio prototype; the repository's “Production Ready” statement is not supported by the checks below.

The largest gap is between the controls shown and the work those controls actually complete. A successful screen render is currently a much stronger guarantee than a successful production handoff.

## Evidence and limitations

- `npm run check`: passed both workspaces.
- `npm test`: 34 tests passed in seven files. Some runner tests exercise installed tools; these are not all isolated unit tests.
- `npm run test:e2e`: six Chromium tests passed. They cover hub theme, wizard completion, graph visibility, export modal visibility, and Blender script generation. Several use project `Vguj34w5`; the settings test can pass without entering its assertion branch.
- `npm run build`: passed. Vite warned about chunks above 500 kB: app entry 501.83 kB and Three.js 527.82 kB, before gzip.
- Headless Chromium captures: hub and canvas at 1440, 1024, and 390 pixels; desktop settings, wizard, and light canvas. No uncaught JavaScript errors in the initial hub/canvas samples.
- Safe fault injection: intercepted DaVinci response with HTTP 500; the UI displayed “Export Complete!”. No actual export job was run in that probe.
- API probes: nonexistent project lookup returned HTTP 200 and created a project; mixer apply route returned 404.
- `browser-evidence.json` and `behavior-evidence.json` preserve probe results. Screenshots are in `screenshots/`.
- A temporary structural graph covered client source only, without clustering. The extractor reported partial parsing of CompositionFloatingHud.tsx; TypeScript compilation passed. It supported navigation rather than architectural proof and was removed during session cleanup.

Not verified: real DaVinci import, Blender execution, full AI generation on every runner, actual media ingestion/rendering, offline/PWA behavior, speech quality, physical touch devices, screen-reader behavior, sustained performance, concurrent-save stress, or exhaustive WCAG compliance. Mobile findings use emulated viewport screenshots, not synthesized touch gestures. Security and data-loss risks below are code findings, not exploit tests. No external web standards research was needed for these implementation findings.

The existing tests create projects and update the recent-project registry. The invalid-ID probe's own created folder and registry entry were removed. Existing automated tests also leave fixtures in recents; isolate the test environment before treating future runs as harmless validation.

## Prioritized findings

Severity: P0 = potential irreversible loss; P1 = broken core workflow or major integrity risk; P2 = usability, recovery, or maintainability issue. “Code” means verified implementation evidence; “browser/API” means exercised behavior.

| ID | Priority | Finding and evidence | User impact and required change |
|---|---|---|---|
| 01 | P0 | **Move to Trash can permanently delete.** `server/src/services/projectRegistry.ts:395` and `projectService.ts:713`: failed Finder deletion falls back to `fs.rm`. Code; failure branch not executed. | A recoverable action becomes irreversible without a new choice. Remove permanent-delete fallback; preserve registry entry on failed trash, report failure, and test both failure paths. |
| 02 | P1 | **Reading missing/corrupt state can initialize over it.** `server/src/index.ts:125`, `projectService.ts:581`: identifiers become paths; load catches all read/parse/migration errors and initializes. Browser/API: unknown ID returned a new project's ID with status 200 and created `server/audit-nonexistent-id/`. | Typos create folders and corrupt JSON can be replaced by defaults. Separate lookup, open, create, and migrate; return typed errors, back up invalid state, never initialize inside load. |
| 03 | P1 | **Export is not scoped to the visible project.** `client/src/components/export/DaVinciExportModal.tsx:35` sends only `{fps}`; server selects a recent/default project without an ID. Intercepted request confirmed `{fps:30}`. | Multi-project sessions can export the wrong project. Require explicit project ID, project FPS, and project revision throughout preflight and export. |
| 04 | P1 | **Export failure appears as success.** Same modal parses every JSON response into exportResult without checking HTTP status or success. Browser-injected HTTP 500 displayed “Export Complete!”. See `screenshots/export-error-false-success.png`. | Users believe failed work is finished. Typed success/error states, inline actionable error, retry, and success only after a validated manifest. |
| 05 | P1 | **Taste editing has broken API contracts.** `TasteMixerModal.tsx:107` posts `/styles/apply` (API returned 404); server implements `/style/resolve` at `index.ts:445`. `TasteFloatingHud.tsx:60` posts `/taste`, which is also absent from server routes. | Style changes cannot complete through these surfaces. Use one shared style command, endpoint, payload, and persisted result. |
| 06 | P1 | **Settings fields are silently ignored.** `ProjectSettingsModal.tsx:66` submits styleMarkdown, basePresetId, styleOverrides, constraints. `index.ts:350` PATCH ignores those fields and returns success. | Save confirmation does not mean all displayed edits were saved. Validate the complete settings contract, resolve style tokens server-side, and verify reload persistence. |
| 07 | P1 | **Media trim/attach is a simulation.** `App.tsx:275` retains file name rather than file bytes, forces 3.5s target, and `App.tsx:545` only alerts. `MediaTrimmerModal.tsx:20` fixes clip duration at 8.5s. Code. | An imported clip is neither probed, trimmed, uploaded, nor attached. Implement real import/probe, source preview, in/out metadata, storage, and node attachment; retain errors and source files. |
| 08 | P1 | **Generated story directions are fixed examples.** `NewProjectWizard.tsx:115` contains three running-shoe stories; `triggerAmbientGeneration` only advances timed statuses. Mood analysis does have a real endpoint; story direction generation does not. | A user can receive unrelated stories presented as generated output. Use a real cancellable generation job or explicitly offer templates. Preserve prompt, duration, selected model, and branch decisions. |
| 09 | P1 | **Timeline transport is not an assembled media player.** `BottomPlaybackDock.tsx` advances local time but contains no audio/video playback. Waveform bars derive from seed math; -14 LUFS is a constant. Code and desktop capture. | Play and loudness imply a playable, measured cut. Add an assembled preview with synchronized audio and actual waveform/levels; mark unavailable media and target loudness honestly. |
| 10 | P1 | **Export completeness and format integrity are not established.** `index.ts:749` invents fallback footage paths and dialogue stem and writes timeline documents; it does not assemble the folders promised in the modal. Builder directly interpolates names into XML, rounds 29.97 to 30, emits second-only EDL timecodes, and uses audio clip names as subtitle text. | Missing assets, XML special characters, fractional timing, square formats (mapped to 1920×1080), and subtitles can break handoff. Preflight actual files, escape XML, use rational frame time, preserve aspect/resolution, derive subtitles from transcript, and validate a real Resolve import. |
| 11 | P1 | **Input and save boundaries are weak.** `index.ts:350` accepts arbitrary nodes/scenes/activeCut and numeric conversions without schema validation. `saveProject` directly writes JSON; registry updates use read/modify/write without serialization. Code; race/data-loss scenarios not executed. | Invalid requests and overlapping tabs/jobs risk invalid graphs or lost changes. Shared schemas, project revisions, serialized mutations, atomic writes, recoverable backups, and conflict responses. |
| 12 | P1 | **Local API trust boundary is too broad.** `index.ts:36` reflects any CORS origin; endpoints can mutate files and invoke tools. Media containment uses startsWith(root), which also matches a sibling with the same prefix (`index.ts:342`). Deletion builds shell/AppleScript strings from paths. Code; no exploit attempts. | Loopback binding alone does not establish caller authorization or robust file containment. Restrict origins, authenticate local sessions, use path-relative containment, and pass filesystem/tool arguments without shell interpolation. |
| 13 | P2 | **Commands can do nothing or vanish on reload.** `App.tsx:559` mutates node model directly without state setter or PATCH; safe-area command is an empty callback. Two Cmd+K listeners have competing open/close logic. Basic opening worked in browser; duplicate-listener impact is a risk, not a reproduced failure. | Commands should report a completed operation. Centralize registry and shortcuts; persist selected model; connect or remove unavailable commands; test reopen, close, and reload. |
| 14 | P2 | **Global shortcuts leak into other tasks.** Dock handles Space/arrows outside INPUT/TEXTAREA only; it does not exclude buttons, selects, contenteditable, modifier combinations, or modal scope. Code. | Keyboard navigation or activating a focused control can also operate transport. One scoped shortcut owner with editable, modal, and modifier guards. |
| 15 | P2 | **Modal accessibility is incomplete.** Desktop settings exposes no dialog role; tabbing from Save Settings leaves the panel. Components do not implement focus trapping or restoration. Browser/DOM and source. Small canvas controls are numerous: 24 buttons below 24px on at least one dimension at desktop; spacing exceptions not assessed. | Keyboard and assistive-technology users lack reliable modal context. Shared accessible dialog primitives, visible labels/focus, restore trigger focus, and larger usable hit regions. Full screen-reader/contrast review remains required. |
| 16 | P2 | **Canvas overview sacrifices readability.** `screenshots/canvas-1440-dark.png` fits all stages into tiny node text while leaving substantial vertical space. Selected controls and node HUDs are distributed across multiple surfaces. Visual judgment. | Users must zoom or open overlays to understand the next action. Stage/scene navigation, readable selected-node inspector, simple overview summaries, explicit next step, and intentional default camera framing. |
| 17 | P2 | **Mobile editing clips core actions.** `screenshots/canvas-390-dark.png` shows header actions outside the viewport, tiny fitted graph, clipped dock, and offscreen scene cards. Document scrollWidth stays 390 because overflow is hidden; that metric alone missed the defect. Mouse-only custom scrubber handlers are visible in source. | Narrow-screen users cannot reach the desktop toolset. Either provide a purposeful review experience or a clear desktop-editing boundary. Tablet editor needs responsive panels; touch requires separate interaction testing. |
| 18 | P2 | **Connection and project lifecycle lack recovery.** `App.tsx:173` opens WebSocket without reconnect/backoff or connection UI; handles only presence/timeline events. Project loads have no request cancellation/sequence guard. Exit/delete paths do not consistently clear selection, agents, dialogs, and URL. Code. | Stale agents, out-of-order project responses, or disconnection can leave misleading state. Project-scoped session reset, abortable loads, connection status, replay/refetch on reconnect, consistent route transitions. |
| 19 | P2 | **Themes and information hierarchy drift across surfaces.** Hub/settings use tokens; wizard hard-codes a dark world and white copy. Many metadata labels use 9–11px text. Hub thumbnails repeat a DAG rather than showing the actual film when media is unavailable. Screenshots/source; complete contrast testing not performed. | Theme changes are inconsistent and important information competes with secondary metadata. Shared tokens and type scale, readable labels, media-first project previews, honest empty previews, and consistent workflow terminology. |
| 20 | P2 | **Test and performance confidence is overstated.** E2E uses fixed existing IDs and conditional assertions; project-service tests register in the real registry without STUDIO_HOME isolation. Three.js is pulled through eager canvas imports; build emits large-chunk warnings. `PROGRESS.md` claims production readiness. | Green checks can miss broken saves, media, and export while polluting the user's hub. Disposable fixtures and environment, action/result/reload assertions, integration preflight, lazy 3D editor, and evidence-based readiness documentation. |
| 21 | P2 | **Runner timeout escalation can fail.** `server/src/runners/base.ts:53` sends SIGTERM then checks `!proc.killed` before SIGKILL; killed indicates a signal was sent, not confirmed exit. Code; resistant child not tested. | A timed-out job may keep running despite a rejected promise. Track actual exit, terminate the process group safely, and verify cleanup/cancellation. |

## Coverage map

| Area | What is supported by this pass | What still needs a focused validation |
|---|---|---|
| Projects | Hub, recent metadata, project routing, create wizard happy path, invalid-ID probe | Existing-folder collisions, corrupt-state recovery, backup/restore, concurrent tabs |
| Graph | Existing selection/rendering, unit coverage for branching/active cut/deletion, source review | Real browser branch/reload, port compatibility/cycle rejection through UI, undo/redo |
| Style/settings | UI/source contracts, missing mixer endpoint, settings payload mismatch | Saved tokens reflected in generation and all nodes after reload |
| Media | Confirmed placeholder trimmer and transport | Real mixed media import, seek, trim, relink, decoded playback, audio sync |
| AI/jobs | Runner tests passed; fixed story-generation mechanism identified | Every runner online/offline, progress/cancel/retry, project isolation and artifacts |
| Subjects/shot prompts | UI/source path reviewed; skill tests pass | Real reference images, binding/variant persistence, continuity, generation quality |
| Exports | Modal, Blender script API, intercepted DaVinci error, builder source | Real Resolve/Blender execution and portable media bundle validation |
| UI | Three viewport sizes, desktop dark/light, settings focus probe | Screen reader, contrast scan, 200% zoom, touch, long labels, very large projects |

## Recommended revamp sequence

### Phase 1 — Protect projects and make state truthful

Address 01, 02, 03, 04, 05, 06, 11, 12, and 21. Establish a shared typed API client, validated command contracts, atomic persistence, explicit project IDs, and visible failure states. Preserve the current visual system during this phase.

Acceptance: bad ID returns 404 with zero filesystem writes; corrupt project remains intact; trash failure never permanently deletes; failed operation never shows success; every settings/style edit survives reload; exporting one of two open projects uses exactly that project's revision; competing writes return conflicts or serialize without loss.

### Phase 2 — Complete one real production path

Address 07–10 and 18. Build and test: brief → script → subject/shot → imported/generated take → approved active cut → playable preview → valid handoff. Use cancellable jobs and explicit states: draft, queued, running, ready, failed, canceled. Separate templates from AI output. Show missing-media and offline-engine recovery in place.

Acceptance: a small film with real video, voiceover, overlay, and a fractional clip duration can be reopened and played in sync; trim attaches actual media; measured waveform is tied to that audio; unavailable assets prevent a misleading export success; bundle imports into Resolve with verified duration, frame rate, resolution, clip order, and links. Repeat for 9:16, 16:9, 1:1, 24/30/29.97 FPS where supported.

### Phase 3 — Reshape the editor around the current task

Address 13–19. Keep the neutral Film Lab/Paper palette and restrained stage colors. Replace the many floating editing surfaces with a clear main composition: stage/scene navigation, central canvas or media preview, one contextual inspector, collapsible timeline, and a job/status tray. Retain the graph as an overview and branching tool. Default to readable selected-stage framing, with Fit all available explicitly.

Shorten onboarding to brief + delivery settings + create. Offer mood, engine, variants, and style as optional production steps inside the project. A seven-step wizard should be optional guided setup, not the only entrance. Unify Taste/DNA/style vocabulary and show the saved state consistently.

Acceptance: a new user can identify the next action without opening multiple HUDs; selected content stays readable at 1024px; keyboard users complete settings and return to their trigger; theme is coherent across wizard/editor/errors; narrow screens expose a deliberately designed review flow. Do not squeeze the desktop canvas into a phone.

### Phase 4 — Establish release confidence

Address 20 and remaining validation. Isolate tests, replace fixture IDs with disposable projects, add behavioral assertions, and lazy-load the 3D surface. Test failed saves, disk errors, lost connection, missing binaries, malformed AI output, simultaneous edits, media relinking, and external handoff.

Release gate: full real-media happy path plus failure recovery passes; no unresolved P0/P1 issues; accessible modal/keyboard checks pass; representative large-project profiling is recorded; Resolve import is manually verified; documentation matches those results. Finish with UI polish after functionality is proven.

## What to preserve

The graph/version model is distinctive and useful for creative alternatives. The neutral theme system, lazy-loaded modal boundaries, project-scoped WebSocket rooms, server-side skill registry, and existing graph unit tests provide a worthwhile base. Rebuilding the entire app from scratch would discard that value without resolving the contract and media-pipeline gaps by itself.
