import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionManager } from "./session.js";
import type { WebSocketBridge } from "./ws-bridge.js";
import { spawnDevServer } from "./proxy.js";
import type { ChildProcess } from "node:child_process";

let activeDevServer: ChildProcess | null = null;

function cleanup(): void {
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
): void {
  mcp.tool(
    "start_session",
    "Starts a dev server and begins a review session. The target app must use the " +
      "@live-design/vite-plugin to inject the overlay. Provide either 'target' (URL of a " +
      "running dev server) or 'command' (shell command to start one). The designer opens " +
      "the dev server URL to see the app with the live-design overlay.",
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
      message: z
        .string()
        .optional()
        .describe("Message shown to the designer when the session starts"),
    },
    async ({ target, command, cwd, message }) => {
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

      let devServerUrl = target!;
      if (command) {
        try {
          const result = await spawnDevServer(command, cwd);
          activeDevServer = result.process;
          devServerUrl = result.url;
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

      session.startSession();

      if (message) {
        bridge.broadcast({
          type: "session:state",
          state: "reviewing",
          message,
        });
      }

      const info = command
        ? `Started dev server at ${devServerUrl}`
        : `Using existing dev server at ${devServerUrl}`;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                url: devServerUrl,
                message: `Designer should open ${devServerUrl} to begin reviewing`,
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
    "Stops the dev server (if started by start_session) and resets the review session.",
    {},
    async () => {
      cleanup();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              status: "stopped",
              message: "Session stopped",
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

  mcp.tool(
    "get_dom_snapshot",
    "Captures the current DOM of the page from the connected designer's browser. " +
      "Returns the outerHTML of <html>, the page URL, and viewport dimensions. " +
      "The live-design overlay element is stripped from the snapshot. Useful for " +
      "verifying changes landed or finding elements before editing source.",
    {},
    async () => {
      try {
        const result = await bridge.requestDomSnapshot();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  url: result.url,
                  viewport: result.viewport,
                  html: result.html,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  mcp.tool(
    "get_screenshot",
    "Captures a PNG screenshot of the current page from the connected designer's " +
      "browser using html2canvas. Returns an image content block. The live-design " +
      "overlay is hidden during capture. Useful when you need to see what the " +
      "designer is actually looking at, including their viewport, theme, and font " +
      "rendering.",
    {},
    async () => {
      try {
        const dataUrl = await bridge.requestScreenshot();
        // Strip "data:image/png;base64," prefix
        const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: invalid data URL returned from browser",
              },
            ],
            isError: true,
          };
        }
        const [, mimeType, data] = match;
        return {
          content: [
            {
              type: "image" as const,
              data,
              mimeType,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
