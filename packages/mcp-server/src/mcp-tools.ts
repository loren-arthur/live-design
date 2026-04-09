import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionManager } from "./session.js";
import type { WebSocketBridge } from "./ws-bridge.js";

export function registerTools(
  mcp: McpServer,
  session: SessionManager,
  bridge: WebSocketBridge,
): void {
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
