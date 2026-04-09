# live-design

Zero-config browser overlay + MCP server for designer-agent review loops. Designers review a running app, comment on components, edit styles/classes, tweak theme variables, and submit structured feedback. The AI agent receives the feedback via MCP tools and makes code changes. The designer reviews again.

## Architecture

npm workspace monorepo with four packages + an example app:

- **@live-design/shared** (`packages/shared/`) — TypeScript types for the message protocol (comments, element changes, theme changes, session state, WebSocket messages, MCP return types). No build step — consumed as raw TS.
- **@live-design/overlay** (`packages/overlay/`) — Browser overlay injected into the target app. Vanilla TypeScript (no React), renders inside a shadow DOM for style isolation. Component selector (React fiber `_debugSource` walking), comment panel, element inspector (class + style editing), theme panel (CSS variable editing), toolbar, submit/freeze flow. ~2400 LOC across 11 modules.
- **@live-design/vite-plugin** (`packages/vite-plugin/`) — Optional Vite plugin that injects the overlay via `transformIndexHtml` and serves overlay dist files via dev server middleware. Alternative to the proxy approach.
- **@live-design/mcp-server** (`packages/mcp-server/`) — MCP stdio server (using `@modelcontextprotocol/sdk`) + WebSocket bridge (port 24678) + HTML-injecting HTTP reverse proxy (port 24680). Spawns dev servers, proxies requests, injects overlay into HTML responses, passes WebSocket upgrades through for HMR.

## Build Commands

```bash
npm install                              # Install all workspace deps
npm run build --workspaces               # Build all packages
npm run build --workspace=packages/overlay   # Build single package
```

Build order matters: shared (no build) → overlay → vite-plugin → mcp-server. The overlay and vite-plugin can build in parallel. The mcp-server depends on both overlay (serves its dist files) and shared.

## Key Conventions

- **Vanilla TypeScript in overlay** — no framework deps. The overlay injects into React apps and must not conflict. All DOM manipulation is programmatic (`createElement`, not `innerHTML`).
- **Shadow DOM isolation** — all overlay UI lives inside a shadow root. Styles are scoped. Z-index 999999 on the host element.
- **npm workspaces** — not pnpm. Workspace deps use `"*"` not `"workspace:*"`.
- **No external HTTP deps** — the proxy uses Node's built-in `http` module. No express, no http-proxy.
- **MCP stdio transport** — the MCP server communicates with Claude Code over stdin/stdout. All logging goes to stderr.
- **WebSocket on port 24678** — overlay ↔ MCP server communication. Auto-reconnect with exponential backoff.
- **Proxy on port 24680** — HTML-injecting reverse proxy sits in front of the user's dev server. Strips compression (`Accept-Encoding: identity`), buffers HTML responses to inject the overlay script.

## MCP Tools

Five tools registered:
1. `start_session` — spawns dev server (or targets existing one), starts proxy, begins review session
2. `wait_for_review` — blocks until designer submits, returns comments + element changes + theme changes + feedback
3. `request_feedback` — unfreezes overlay after agent makes changes, shows message to designer
4. `get_session_state` — non-blocking status check
5. `stop_session` — kills proxy + dev server, resets session

## Testing

No test framework set up yet. To verify packages compile:

```bash
npm run build --workspaces
```

To test the example app:

```bash
cd example && npm run dev
```

## Anti-patterns

- Don't add React or any framework as a dependency of the overlay package
- Don't use `innerHTML` in overlay code — createElement only (XSS prevention)
- Don't import from `@live-design/shared` in overlay runtime code — the Vite plugin and proxy rewrite these imports by inlining constants
- Don't add external HTTP framework deps to the mcp-server — use Node built-ins
