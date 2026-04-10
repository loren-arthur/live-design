import { WebSocketServer, WebSocket } from "ws";
import type { BrowserMessage, ServerMessage } from "@live-design/shared";
import type { SessionManager } from "./session.js";

export class WebSocketBridge {
  private wss: WebSocketServer;
  private session: SessionManager;

  constructor(port: number, session: SessionManager) {
    this.session = session;
    this.wss = new WebSocketServer({ port, host: "0.0.0.0" });

    this.wss.on("connection", (ws) => {
      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(String(raw)) as BrowserMessage;
          this.handleMessage(ws, msg);
        } catch {
          // Ignore malformed messages
        }
      });
    });
  }

  private handleMessage(ws: WebSocket, msg: BrowserMessage): void {
    switch (msg.type) {
      case "comment:add": {
        const comment = this.session.addComment(msg.comment);
        this.broadcast({ type: "comment:added", comment });
        break;
      }

      case "comment:remove": {
        const removed = this.session.removeComment(msg.commentId);
        if (removed) {
          this.broadcast({ type: "comment:removed", commentId: msg.commentId });
        }
        break;
      }

      case "theme:change": {
        // For theme:change from browser, we need the old value.
        // The browser sends the new value; we record the change
        // with oldValue as empty since we don't track CSS state server-side.
        // The overlay is responsible for sending the correct current value.
        this.session.recordThemeChange(msg.variable, "", msg.value);
        this.broadcast({
          type: "theme:applied",
          variable: msg.variable,
          value: msg.value,
        });
        break;
      }

      case "theme:reset": {
        this.session.clearThemeChanges();
        this.broadcast({ type: "theme:cleared" });
        break;
      }

      case "element:change": {
        const change = this.session.recordElementChange(msg.change);
        this.broadcast({ type: "element:changed", change });
        break;
      }

      case "element:reset": {
        const removed = this.session.removeElementChange(msg.changeId);
        if (removed) {
          this.broadcast({ type: "element:reset", changeId: msg.changeId });
        }
        break;
      }

      case "review:submit": {
        const result = this.session.submitReview(msg.feedback, msg.author);
        if (result) {
          this.broadcast({ type: "session:state", state: "frozen" });
          this.broadcast({ type: "review:received" });
        }
        break;
      }

      case "session:ping": {
        const { state } = this.session.getState();
        const reply: ServerMessage = { type: "session:state", state };
        ws.send(JSON.stringify(reply));
        break;
      }
    }
  }

  broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  requestFeedback(message: string, resolvedComments?: string[]): void {
    this.session.requestFeedback(message, resolvedComments);
    this.broadcast({ type: "feedback:requested", message });
    this.broadcast({ type: "session:state", state: "reviewing", message });
  }

  close(): void {
    this.wss.close();
  }
}
