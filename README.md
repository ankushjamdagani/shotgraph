# Visual AI Video Studio

A local React/Fastify studio for developing briefs, branching production ideas, importing takes, reviewing an active cut, and preparing a DaVinci handoff.

## Run locally

```sh
npm install
npm run dev
```

Open [the studio](http://127.0.0.1:3000). FFmpeg and FFprobe must be on PATH for media import and export preflight. Native speech and Finder Trash currently require macOS. Failed Trash operations preserve files.

Create a project from the brief, optionally use guided story generation, and add the first scene in the studio. Import video into the active take, or select a take node and import a replacement. The source is retained in `raw_footage`; processed copies live in `assets`. The timeline plays attached video and dialogue. Mobile provides a review layout; graph editing is intended for desktop.

The language engines are Antigravity (`agy` on PATH, override with `AGY_BIN_PATH`), Claude (`claude` on PATH), and local Ollama. Install/authenticate the engine you select. Unavailable engines and malformed responses produce errors; the app does not substitute generated-looking sample output. You can create a blank project without a language model.

Export requires real footage for each scene. It produces FCPXML, a primary-video EDL, copied media, a manifest, and a style guide in a unique directory under `exports`. SRT is included only when transcript text is present. Keep the timeline beside its media folders. Real DaVinci/Blender import still needs manual verification in those applications.

## Validation

```sh
npm run check
npm test
npm run test:e2e
npm run build
```

Server tests use disposable registries. Browser tests start separate servers on ports 3100/3131 and create disposable projects under `.tmp-e2e`, rather than reusing your recent projects. They require Chromium installed for Playwright and FFmpeg/FFprobe for the real media fixture.

## Local API

The frontend proxies `/api` and `/ws` to the backend. Mutations require the per-server `x-studio-token` returned by `/api/session`; browser callers must also use an allowed origin. `STUDIO_ORIGINS` is a comma-separated allowlist. The defaults permit the local development app on port 3000 and the backend on 3030. `PORT`, `STUDIO_CLIENT_PORT`, `STUDIO_API_URL`, and `STUDIO_HOME` configure local instances.

Project reads never create projects. Explicit creation refuses an existing project folder. Saves retain `.studio/project.json.bak`, use atomic replacement, and reject stale revisions. Keep normal backups of your project folders; the single previous revision is for immediate recovery, not long-term version history.

See [the audit](audits/2026-11-16/AUDIT.md) and [implementation evidence](audits/2026-11-16/IMPLEMENTATION.md).
