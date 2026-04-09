#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { DEFAULT_PORT } from "@live-design/shared";
import { SessionManager } from "./session.js";
import { WebSocketBridge } from "./ws-bridge.js";
import { registerTools } from "./mcp-tools.js";

function resolveOverlayDir(): string {
  const require = createRequire(import.meta.url);
  const overlayMain = require.resolve("@live-design/overlay");
  return dirname(overlayMain);
}

async function main(): Promise<void> {
  const port = Number(process.env.LIVE_DESIGN_PORT) || DEFAULT_PORT;
  const overlayDir = resolveOverlayDir();

  // Core state
  const session = new SessionManager();

  // WebSocket bridge for browser overlay communication
  const bridge = new WebSocketBridge(port, session);

  // MCP server on stdio for Claude Code
  const mcp = new McpServer({
    name: "live-design",
    version: "0.1.0",
  });

  registerTools(mcp, session, bridge, overlayDir);

  const transport = new StdioServerTransport();
  await mcp.connect(transport);

  // Log to stderr so it doesn't interfere with MCP stdio protocol
  process.stderr.write(
    `live-design MCP server running (WebSocket on port ${port})\n`,
  );

  // Graceful shutdown
  process.on("SIGINT", () => {
    bridge.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    bridge.close();
    process.exit(0);
  });
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
