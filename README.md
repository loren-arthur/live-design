# live-design

A browser overlay that lets designers review a running app — comment on components, edit styles and classes, tweak theme variables — then submit structured feedback that an AI coding agent receives via MCP and acts on. No codebase changes required.

## How It Works

```
        Designer                         Agent (Claude Code)
        --------                         -------------------

    1.                       <--------   agent calls start_session()
                                          (spawns dev server + proxy)
    2.  Opens proxy URL
        Overlay activates    <--------   agent calls wait_for_review()
    3.  Cmd+click components
        Add comments
        Edit styles/classes
        Tweak theme variables
    4.  Click "Submit Review"
        Write high-level feedback
    5.  Overlay freezes      -------->   wait_for_review() returns:
                                          - comments (component + file:line)
                                          - element changes (class/style diffs)
                                          - theme changes (variable diffs)
                                          - feedback (free text)
    6.                                   Agent edits code...
    7.  Overlay unfreezes    <--------   agent calls request_feedback("Fixed X")
    8.  See changes via HMR
        Review again (go to 3)
```

## Quick Start (Zero Config)

Add the MCP server to Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "live-design": {
      "command": "node",
      "args": ["/absolute/path/to/live-design/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Then in any project, the agent calls:

```
start_session({ command: "npm run dev", cwd: "/path/to/project" })
```

This spawns the dev server, detects the port, starts an HTML-injecting proxy, and returns a URL for the designer to open. No npm installs or config changes in the target project.

### Building from Source

```bash
cd ~/repo/live-design
npm install
npm run build --workspaces
```

### Running the Example

```bash
cd example
npm run dev
# Open http://localhost:5173
```

## MCP Tools

### `start_session`

Starts the proxy and review session. Provide either `target` (URL of a running dev server) or `command` (shell command to start one — URL auto-detected from stdout).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target` | string | one of target/command | URL of running dev server |
| `command` | string | one of target/command | Shell command to start dev server |
| `cwd` | string | no | Working directory for command |
| `port` | number | no | Proxy port (default 24680) |
| `author` | string | no | Default comment author name |
| `theme_variables` | string[] | no | CSS variables to expose in theme panel |

### `wait_for_review`

Blocks until the designer submits a review. Returns comments (with component source locations), element changes (class/style diffs), theme variable changes, and free-text feedback.

### `request_feedback`

Called after the agent makes code changes. Unfreezes the overlay so the designer can review. The agent should call `wait_for_review` again to get the next round.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | yes | What changed, shown to the designer |
| `resolved_comments` | string[] | no | Comment IDs the agent addressed |

### `get_session_state`

Returns current session state without blocking.

### `stop_session`

Stops the proxy, kills the spawned dev server, resets the session.

## Overlay Features

- **Component selector** — Cmd/Ctrl+click any element to see its React component name and source location
- **Comment system** — pin comments to specific components with file:line attribution
- **Element inspector** — edit classes (add/remove from indexed stylesheet classes) and computed styles (color pickers, sliders) with live preview
- **Theme panel** — live-edit CSS custom properties with instant visual feedback
- **Submit/freeze flow** — submit review with feedback, overlay freezes until agent calls `request_feedback`

## Architecture

```
packages/
  shared/          Message protocol types (comments, element changes, theme, sessions)
  overlay/         Browser overlay (shadow DOM, vanilla TS, ~2400 LOC)
  vite-plugin/     Optional Vite plugin for deep integration (alternative to proxy)
  mcp-server/      MCP stdio server + WebSocket bridge + HTML-injecting proxy
example/           Demo landing page app
```

**Zero-config path**: MCP server spawns dev server → starts proxy → injects overlay into HTML responses → WebSocket connects overlay to MCP → Claude Code receives structured reviews.

**Vite plugin path** (optional): For projects that want the overlay baked into their dev server config instead of using the proxy.

## License

MIT
