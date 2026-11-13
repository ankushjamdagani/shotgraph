# Project Implementation & Resumption Progress

This document tracks all iterative development phases, sub-milestones, active status, and recovery checkpoints for the **Visual AI Video Studio (PWA)**.

---

## Current Status: Phase 3 Completed -> Entering Phase 4 (Local Backend Service & AG-UI Hub)
**Active Phase**: Phase 4
**Last Updated**: Phase 3 Complete (SkillRegistry, TasteAnalyzer, TasteMixer, HookGenerator, BeatScriptwriter, PromptSynthesizer, FCPXMLBuilder)
**Resumption Instruction**: Run `npm --workspace=server test` to confirm all 8 unit tests pass, then proceed with Phase 4 backend service and AG-UI WebSocket hub.

---

## Iterative Development Roadmap

### Phase 1: Development Harness & Project Foundations
- [x] **Step 1.1**: Initialize Git repository on `main` branch.
- [x] **Step 1.2**: Define `video_studio_verifier` development subagent.
- [x] **Step 1.3**: Create `PROGRESS.md` resumption ledger and `.gitignore`.
- [x] **Step 1.4**: Setup root workspace `package.json` and TypeScript configuration (`tsconfig.json`).
- [x] **Step 1.5**: Implement `scripts/health-check.ts` to audit all installed local tools (`gemini`, `claude`, `ollama`, `ffmpeg`, `yt-dlp`, `hyperframes`).
- [x] **Step 1.6**: Define standardized AG-UI event schemas (`server/src/protocol/aguiEvents.ts`) and A2UI component schemas (`server/src/protocol/a2uiSchema.ts`).

---

### Phase 2: Headless Toolchain & Runner Adapters
- [x] **Step 2.1**: Implement `server/src/runners/base.ts` (child process spawner with timeout, exit code capture, and streaming output).
- [x] **Step 2.2**: Implement `server/src/runners/geminiRunner.ts` (default headless `gemini -p "..." -y` runner).
- [x] **Step 2.3**: Implement `server/src/runners/claudeRunner.ts` (`claude -p "..."` headless adapter).
- [x] **Step 2.4**: Implement `server/src/runners/ollamaRunner.ts` (local Ollama HTTP API adapter).
- [x] **Step 2.5**: Implement `server/src/runners/hyperframesRunner.ts` (`npx hyperframes` transcribe, tts, render, snapshot).
- [x] **Step 2.6**: Implement `server/src/runners/mediaRunner.ts` (FFmpeg slicing, silencedetect, audio ducking to -14 LUFS, and `yt-dlp` reference downloader).
- [x] **Step 2.7**: Unit tests for all runner adapters (`server/test/runners/runners.test.ts`).

---

### Phase 3: Atomic Swarm of Skills
- [x] **Step 3.1**: Define atomic skill contract (`server/src/skills/core/types.ts`) and `registry.ts`.
- [x] **Step 3.2**: `skill-taste-analyzer`: Ingest reference videos, extract palette, fonts, cut cadence, and output `STYLE.md` + negative style guards.
- [x] **Step 3.3**: `skill-taste-mixer`: Interactive attribute matrix mixer (*Pacing from Ref 1, Colors from Ref 2*).
- [x] **Step 3.4**: `skill-hook-generator` & `skill-beat-scriptwriter`: Ideation hooks and timed beat sheets with on-screen text tags.
- [x] **Step 3.5**: `skill-shot-breakdown` & `skill-safezone-audit`: Visual layer mapping and 9:16 Instagram safe margins check.
- [x] **Step 3.6**: `skill-audio-manager`: Word-level Whisper transcription, Kokoro TTS synthesis, SFX alignment, and ducking.
- [x] **Step 3.7**: `skill-external-prompt-synthesizer`: 1-click prompt generator for Midjourney, Flux, Kling, Runway, ElevenLabs with locked style tokens.
- [x] **Step 3.8**: `skill-fcpxml-builder`: Generates DaVinci Resolve FCPXML v1.10 and EDL multi-track bundles with ProRes 4444 alpha overlays.
- [x] **Step 3.9**: Unit tests for all skills (`server/test/skills/skills.test.ts`).

---

### Phase 4: Local Backend Service & AG-UI WebSocket Hub
- [ ] **Step 4.1**: Fastify HTTP server (`server/src/index.ts`) serving REST endpoints for projects, scenes, and media assets.
- [ ] **Step 4.2**: AG-UI WebSocket event broker broadcasting real-time streaming thoughts, tool calls, and multi-agent cursors.
- [ ] **Step 4.3**: Project File System Manager (`server/src/services/projectService.ts`): Initializes self-contained folders (`raw_footage/`, `references/`, `assets/`, `compositions/`, `exports/`, `.studio/`) with relative path integrity.
- [ ] **Step 4.4**: Bi-directional file watcher (`chokidar`) syncing Finder file drops directly to UI.
- [ ] **Step 4.5**: Background render job queue & concurrency limiter.

---

### Phase 5: Studio UI Workstation (PWA Client)
- [ ] **Step 5.1**: Scaffold Vite + React 19 + TypeScript + Tailwind CSS PWA client with Desktop Web App Manifest.
- [ ] **Step 5.2**: Interactive Version Tree Canvas (`@xyflow/react`): custom stage nodes, branching controls, active cut line highlight.
- [ ] **Step 5.3**: Multi-Agent Visual Cursors & Status Badges: Floating colored agent cursors with live thinking bubbles.
- [ ] **Step 5.4**: Multi-Scene Timeline & Player: Variable-length scrubber, synchronized waveform, word caption triggers, and 9:16 safe area guides.
- [ ] **Step 5.5**: A2UI Dynamic Inspector: Model selector, prompt editor, plain-English "knob" fine-tuning, streaming output drawer.
- [ ] **Step 5.6**: Media Trimmer Modal: Dual-handle visual In/Out scrubber for external video clips.
- [ ] **Step 5.7**: Interactive Taste Mixer Modal: Multi-reference attribute sliders and negative prompt editor.
- [ ] **Step 5.8**: `Cmd+K` Command Palette & Right-Click Context Menus.
- [ ] **Step 5.9**: Meta UI/UX Theme & Density Switcher.

---

### Phase 6: Integration, Verification & Sample Project
- [ ] **Step 6.1**: End-to-end integration test creating a hybrid sample project.
- [ ] **Step 6.2**: Verify FCPXML v1.10 import compatibility for DaVinci Resolve.
- [ ] **Step 6.3**: Walkthrough documentation and quick-start guide.
