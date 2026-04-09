# live-design

A browser overlay that lets designers comment on components, tweak themes, and submit structured reviews -- then an AI coding agent (Claude Code) receives those reviews via MCP and makes the changes. The designer reviews again. Repeat until done.

## How It Works

```
        Designer                         Agent (Claude Code)
        --------                         -------------------

    1.  Overlay activates    <--------   agent calls wait_for_review()
    2.  Cmd+click components
        Add comments
        Tweak theme variables
    3.  Click "Submit Review"
        Write high-level feedback
    4.                       -------->   wait_for_review() returns:
                                          - comments (component + location)
                                          - theme changes (variable diffs)
                                          - feedback (free text)
    5.                                   Agent edits code...
    6.  Overlay unfreezes    <--------   agent calls request_feedback("Fixed X")
    7.  See changes via HMR
        Review again (go to 2)
```

## Quick Start

```bash
# Install and build all packages
pnpm install
pnpm -r build

# Run the example app
cd example
pnpm install
pnpm dev
```

In another terminal, add the MCP server to your Claude Code config (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "live-design": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"]
    }
  }
}
```

Then ask Claude Code to use `wait_for_review` to start a design review session.

## Usage in Your Project

### 1. Install dependencies

```bash
pnpm add -D @live-design/vite-plugin
```

### 2. Add the Vite plugin

```ts
// vite.config.ts
import { liveDesign } from "@live-design/vite-plugin";

export default defineConfig({
  plugins: [
    react(), // or vue(), svelte(), etc.
    liveDesign({
      author: "Designer",
      themeVariables: [
        "--brand-primary",
        "--brand-bg",
        // ... your CSS custom properties
      ],
    }),
  ],
});
```

### 3. Configure the MCP server

Add to `~/.claude/settings.json` (or your project's `.mcp.json`):

```json
{
  "mcpServers": {
    "live-design": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/index.js"]
    }
  }
}
```

## MCP Tools

### `wait_for_review`

Starts a review session and blocks until the designer submits. Returns all comments (with component source locations), theme variable changes, and free-text feedback.

**Parameters:**
- `message` (optional) -- message shown to the designer when the session starts

### `request_feedback`

Called after the agent makes code changes. Unfreezes the overlay so the designer can see the changes (via Vite HMR) and review again. Returns immediately.

**Parameters:**
- `message` -- what the agent changed, shown to the designer
- `resolved_comments` (optional) -- comment IDs the agent believes it addressed

### `get_session_state`

Returns current session state, comments, and theme changes without blocking. Useful for checking status.

## Overlay Features

- **Component selector** -- Cmd+click (or Ctrl+click) any element to attach a comment with source location
- **Comment system** -- add, view, and remove comments pinned to specific components
- **Theme panel** -- live-edit CSS custom properties and see changes instantly
- **Submit/freeze flow** -- submit review with feedback text, overlay freezes until agent calls `request_feedback`

## Architecture

```
packages/
  shared/          Types shared between all packages
  vite-plugin/     Vite plugin -- injects overlay into dev server HTML
  overlay/         Browser overlay -- component selector, comments, theme panel
  mcp-server/      MCP stdio server + WebSocket bridge to browser
```

Communication flow: **MCP stdio** (Claude Code <-> mcp-server) and **WebSocket** (mcp-server <-> browser overlay). The Vite plugin injects the overlay script and serves config at dev time.

## License

MIT
