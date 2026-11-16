# Audit fixes: implementation and verification

16 November 2026. This supersedes the earlier production-readiness claim in PROGRESS.md. The original AUDIT.md is preserved as the pre-change record.

## Changes by finding

| Audit IDs | Implemented change |
|---|---|
| 01 | Trash operations use argument-based native execution, propagate errors, and retain registry entries/files when Trash fails. Permanent-delete fallback removed. |
| 02 | Load never initializes; unknown IDs return 404; corrupt state returns 422 without replacing the original; create refuses existing projects. Concurrent creation is serialized by project folder. |
| 03–04 | Export sends visible project ID, FPS, and revision; errors remain errors; success is shown only after a completed bundle. |
| 05–06 | Both style editors call `/style/resolve`. Settings persist the submitted style fields and resolved tokens. Failed saves remain visible instead of confirming an in-memory fallback. |
| 07 | Import accepts file bytes, keeps originals, probes duration, validates trims, transcodes a copy, measures waveform peaks, and attaches only after processing. The trimmer previews the actual source and stays open on errors. |
| 08 | Story directions come from the selected engine through a validated endpoint. Timed sample directions and oscillator “audio previews” removed. Requests cancel on wizard unmount. Unavailable engines/invalid JSON fail explicitly. Quick project creation bypasses guided generation. |
| 09 | Timeline preview plays attached scene video and dialogue, with frame stepping, seeking, real imported-audio waveform data, and missing/undecodable-media errors. The previous fake loudness meter is replaced by a clearly labeled target. |
| 10 | Export preflights existing files, durations and video availability; copies only real attached media; escapes XML; preserves rational frame timing, square/anamorphic dimensions, and transcript text; writes manifest and staged bundle. EDL is explicitly primary-video-only. Blender dimensions and fractional FPS also corrected. |
| 11 | Shared save validation, project revisions, serialized/atomic project and registry writes, a previous-state backup, browser revision headers, and 409 conflicts. New/changed graph edges are validated. Existing legacy edge contracts are preserved rather than silently rewritten. |
| 12 | Origin allowlist, per-server mutation/session token, token-protected WebSockets, contained/real-path checks, and removal of broad static `/media` serving. Native speech and Trash use argument-based process calls. |
| 13–14 | Model commands persist node changes, safe-area command controls preview guides, duplicate Cmd+K ownership removed, transport shortcuts exclude modals/editable controls/modifier combinations, and scrubber uses pointer capture/cancel handling. |
| 15 | Shared dialog roles, labels, focus trap/restore, Escape handling, inert background branches, visible focus, and announced errors. Applied to settings, wizard, subjects, style, export, trim, command palette, and project removal. |
| 16–17 | One contextual inspector replaces stacked/pinned HUDs. Stage navigation and a readable initial canvas zoom replace the fit-everything default. Header/dock controls wrap. Narrow screens use a deliberate scene review layout with reachable controls. |
| 18 | WebSocket reconnect/backoff, visible connection state, resync on reconnect, persisted-project broadcasts, stale-load sequence guards, project-session resets, URL cleanup, and watcher cleanup on removal. |
| 19 | Wizard/node surfaces follow Film Lab/Paper tokens; light-theme accents and node titles corrected; inspector labels enlarged; transport no longer presents invented measurement. |
| 20 | Disposable test registries/projects and no fixed user IDs; conditional test assertions removed; behavior/reload/failure checks added. Three.js loads on demand with its node editor. Historical readiness claim corrected. |
| 21 | Timeouts terminate process groups, escalate based on actual exit, support abort, and reject signal exits instead of reporting success. A SIGTERM-resistant child is covered by regression tests. |

## Verification

- Type checks pass for both workspaces.
- 41 server tests pass across eight files, including failed Trash, corrupt reads, stale saves/backups, malformed engine output, empty speech output, and resistant-process cleanup.
- 12 Chromium browser tests pass. They exercise disposable projects, guided wizard (stubbed engine response), actual settings/style persistence, unauthorized origin/session rejection, corruption preservation, project-scoped export errors, keyboard modal behavior, persisted model commands, mobile review, actual FFmpeg import, browser-decoded playback, and a portable export bundle.
- The real-media test creates a short synthetic H.264/AAC clip, imports/trims it through the API, verifies measured waveform data, serves and decodes it in Chromium, plays it, exports at 29.97 FPS, parses XML with Python, and checks that every manifest media file exists in the bundle. It does not merely check button visibility.
- Production build passes. The main app chunk drops from roughly 502 kB to 464 kB before gzip. Three.js remains roughly 528 kB and still triggers Vite's large-chunk warning, but is now loaded on demand.
- Desktop (1440), tablet (1024), mobile (390), and light-theme captures are in `after/`. The blue video is a synthetic test fixture, not generated film content.

## Remaining validation and constraints

These implementation changes are not a claim of production certification. Real Resolve import and Blender execution must be checked in those native applications. FCPXML is generated and parsed, but full schema/application compatibility is not established by XML parsing alone. Real engine generation/authentication and native speech quality remain environment-dependent; browser wizard tests stub the AI response, and voice unit tests stub the native engine. Speech now rejects empty output instead of estimating success.

Imported audio waveform data is measured. The UI shows a loudness target, not a measured LUFS value. Export supports the actual attached footage, overlays, and dialogue; it does not invent SFX/music stems or word timing. SRT from transcript text is clip-level, not word-level transcription. The live preview synchronizes active-scene video and dialogue; it is not a final composited VFX render. Overlay compositing is represented in the handoff timeline.

Legacy incompatible graph edges remain preserved until explicitly edited; new edits are validated. No exhaustive concurrent-tab stress test, full screen-reader/contrast audit, physical touch-device test, offline/PWA audit, or large-production performance certification was performed. Mobile is a review surface; desktop remains the authoring environment. Further visual work should be driven by real projects and those remaining checks rather than another wholesale reskin.
