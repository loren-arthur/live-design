---
name: live-design
description: Run a live-design review session — start the dev server with the overlay, collect designer feedback, apply changes, iterate
---

You are running a live-design feedback session. The live-design MCP server must be registered in `.mcp.json` and the `@live-design/vite-plugin` must be added to the target app's `vite.config.ts`.

## Prerequisites check

Before starting, verify:
1. The `live-design` MCP server is available (its tools should appear as `mcp__live-design__*`).
2. The target Vite config imports and uses `liveDesign()` from `@live-design/vite-plugin`.

If either is missing, set them up:
- MCP registration: add to `.mcp.json` at the repo root, pointing `node` at the built `packages/mcp-server/dist/index.js` in the live-design repo.
- Vite plugin: `npm install /path/to/live-design/packages/vite-plugin` in the frontend, then add `liveDesign({ author: 'Designer' })` to the plugins array.

## Session loop

### 1. Start the session

Call `mcp__live-design__start_session` with **exactly one** of:
- `command`: a shell command to start the dev server (e.g. `"npm run dev"`), plus `cwd` for the frontend directory
- `target`: URL of an already-running dev server

Passing both errors. Prefer `target` if the designer already has a dev server running — spawning a second one fights over the port. Include a `message` telling the designer what to review.

### 2. Wait for feedback

Call `mcp__live-design__wait_for_review`. This blocks until the designer submits. The return contains:
- `comments[]` — each has `location` (component, file, line, column), `text`, `author`, `id`
- `themeChanges[]` — Radix Themes prop diffs (variable, oldValue, newValue)
- `feedback` — free-text summary

### 3. Triage and implement

For each comment:
- Read the referenced file at the indicated line to understand context.
- Categorize: quick UI fix, bug fix, feature addition, or needs-backend-change.
- Implement what you can. For items requiring backend changes, check if the API already supports it before adding new endpoints.

After all changes, verify types with `npx tsc --noEmit` in the frontend directory.

### 4. Request next round

Call `mcp__live-design__request_feedback` with:
- `message`: summary of what you changed
- `resolved_comments`: array of comment IDs you addressed

This unfreezes the overlay. The designer reviews the HMR-updated app and can submit another round.

### 5. Repeat

Call `mcp__live-design__wait_for_review` again. Continue the loop until the designer is satisfied or closes the session.

### 6. End session

When done, call `mcp__live-design__stop_session` to clean up the dev server. Safe to call even if you used `target` and didn't spawn the server — it just resets session state.

## Inspection tools

Use these mid-loop when you need to see what the designer sees:
- `mcp__live-design__get_dom_snapshot` — returns the page's `<html>` outerHTML, URL, and viewport (overlay stripped). Use to verify a change landed or to locate an element before editing.
- `mcp__live-design__get_screenshot` — returns a PNG of the designer's viewport via html2canvas (overlay hidden). Use when font rendering, theme state, or layout-in-context matters.
- `mcp__live-design__get_session_state` — non-blocking snapshot of comments / theme changes / state. Useful for status checks; do **not** poll it as a substitute for `wait_for_review`.

## Rules

- Always read the file at the comment's location before making changes. `location.file` and `location.line` already point at the original source — the overlay decodes the Vite source map via React's `_debugSource`. Do not try to re-map them.
- Don't guess at fixes. If a comment says something is broken, investigate the actual error (check browser console via DOM snapshot, backend logs, API responses).
- Theme changes should be applied to the `<Theme>` component props in source, not just runtime.
- Keep changes minimal and focused on the feedback. Don't refactor surrounding code.
- If the designer's feedback conflicts with existing architecture decisions documented in CLAUDE.md or decision logs, flag the conflict rather than silently overriding.
