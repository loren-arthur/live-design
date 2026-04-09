import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionManager } from "./session.js";
import type { WebSocketBridge } from "./ws-bridge.js";
import { startProxy, spawnDevServer, type ProxyHandle } from "./proxy.js";
import type { ChildProcess } from "node:child_process";

let activeProxy: ProxyHandle | null = null;
let activeDevServer: ChildProcess | null = null;

function cleanup(): void {
  if (activeProxy) {
    activeProxy.close();
    activeProxy = null;
  }
  if (activeDevServer) {
    activeDevServer.kill();
    activeDevServer = null;
  }
}

// Clean up on process exit
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

export function registerTools(
  mcp: McpServer,
  session: SessionManager,
  bridge: WebSocketBridge,
  overlayDir: string,
): void {
  mcp.tool(
    "start_session",
    "Starts an HTML-injecting proxy in front of the user's dev server and begins a review session. " +
      "Provide either 'target' (URL of a running dev server) or 'command' (shell command to start one). " +
      "The designer opens the proxy URL to see the app with the live-design overlay injected. " +
      "No changes to the user's codebase are needed.",
    {
      target: z
        .string()
        .optional()
        .describe(
          'URL of a running dev server, e.g. "http://localhost:5173". Use this OR command, not both.',
        ),
      command: z
        .string()
        .optional()
        .describe(
          'Shell command to start the dev server, e.g. "npm run dev". The server URL is auto-detected from stdout.',
        ),
      cwd: z
        .string()
        .optional()
        .describe("Working directory for the command (defaults to project root)"),
      port: z
        .number()
        .optional()
        .describe("Proxy port (default 24680)"),
      message: z
        .string()
        .optional()
        .describe("Message shown to the designer when the session starts"),
      author: z
        .string()
        .optional()
        .describe("Default author name for comments"),
      theme_variables: z
        .array(z.string())
        .optional()
        .describe("CSS variable names to expose in the theme panel"),
    },
    async ({ target, command, cwd, port, message, author, theme_variables }) => {
      // Validate: need exactly one of target or command
      if (!target && !command) {
        return {
          content: [{ type: "text" as const, text: "Error: provide either 'target' (URL) or 'command' (shell command), not neither." }],
          isError: true,
        };
      }
      if (target && command) {
        return {
          content: [{ type: "text" as const, text: "Error: provide either 'target' or 'command', not both." }],
          isError: true,
        };
      }

      // Clean up any previous session
      cleanup();

      // If command provided, spawn the dev server and detect URL
      let resolvedTarget = target!;
      if (command) {
        try {
          const result = await spawnDevServer(command, cwd);
          activeDevServer = result.process;
          resolvedTarget = result.url;
        } catch (err) {
          return {
            content: [{
              type: "text" as const,
              text: `Error starting dev server: ${err instanceof Error ? err.message : String(err)}`,
            }],
            isError: true,
          };
        }
      }

      // Start the proxy
      activeProxy = startProxy({
        target: resolvedTarget,
        port,
        overlayDir,
        author,
        themeVariables: theme_variables,
      });

      // Start or reuse the current review session
      session.startSession();

      // If a message was provided, broadcast it to connected browsers
      if (message) {
        bridge.broadcast({
          type: "session:state",
          state: "reviewing",
          message,
        });
      }

      const info = command
        ? `Started dev server (detected at ${resolvedTarget}), proxy at ${activeProxy.url}`
        : `Proxy started at ${activeProxy.url} → ${resolvedTarget}`;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                proxy_url: activeProxy.url,
                dev_server_url: resolvedTarget,
                message: `Designer should open ${activeProxy.url} to begin reviewing`,
                info,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  mcp.tool(
    "stop_session",
    "Stops the HTML-injecting proxy and resets the review session.",
    {},
    async () => {
      cleanup();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              status: "stopped",
              message: "Proxy and dev server stopped, session reset",
            }),
          },
        ],
      };
    },
  );

  mcp.tool(
    "wait_for_review",
    "Starts a review session and blocks until the designer submits their review. " +
      "Returns all comments, theme changes, and feedback text. " +
      "This is the primary tool for receiving design feedback.",
    {
      message: z
        .string()
        .optional()
        .describe("Message shown to the designer when the session starts"),
    },
    async ({ message }) => {
      // Start or reuse the current session
      session.startSession();

      // If a message was provided, broadcast it to connected browsers
      if (message) {
        bridge.broadcast({
          type: "session:state",
          state: "reviewing",
          message,
        });
      }

      // Block until the designer submits
      const result = await session.waitForReview();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  mcp.tool(
    "request_feedback",
    "Called after the agent has made code changes. Unfreezes the overlay so the " +
      "designer can review the changes. Returns immediately. Call wait_for_review " +
      "again after this to get the next round of feedback.",
    {
      message: z
        .string()
        .describe("What the agent changed, shown to the designer"),
      resolved_comments: z
        .array(z.string())
        .optional()
        .describe("Comment IDs the agent believes it has addressed"),
    },
    async ({ message, resolved_comments }) => {
      bridge.requestFeedback(message, resolved_comments);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              status: "feedback_requested",
              message,
              resolvedComments: resolved_comments ?? [],
            }),
          },
        ],
      };
    },
  );

  mcp.tool(
    "get_session_state",
    "Returns the current session state, comments, and theme changes. " +
      "Non-blocking, useful for checking status without waiting.",
    {},
    async () => {
      const { session: sess, state } = session.getState();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                state,
                session: sess,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
