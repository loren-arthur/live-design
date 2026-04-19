import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import type { BrowserMessage, ServerMessage } from "@live-design/shared";
import type { SessionManager } from "./session.js";

interface PendingDomRequest {
  resolve: (value: { html: string; url: string; viewport: { width: number; height: number } }) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface PendingScreenshotRequest {
  resolve: (dataUrl: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class WebSocketBridge {
  private wss: WebSocketServer;
  private session: SessionManager;
  private domRequests = new Map<string, PendingDomRequest>();
  private screenshotRequests = new Map<string, PendingScreenshotRequest>();

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

      case "review:submit": {
        const result = this.session.submitReview(msg.feedback, msg.author, msg.consoleLogs);
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

      case "dom:snapshot": {
        const pending = this.domRequests.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timer);
          pending.resolve({ html: msg.html, url: msg.url, viewport: msg.viewport });
          this.domRequests.delete(msg.requestId);
        }
        break;
      }

      case "screenshot:result": {
        const pending = this.screenshotRequests.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timer);
          pending.resolve(msg.dataUrl);
          this.screenshotRequests.delete(msg.requestId);
        }
        break;
      }

      case "screenshot:error": {
        const pending = this.screenshotRequests.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timer);
          pending.reject(new Error(msg.error));
          this.screenshotRequests.delete(msg.requestId);
        }
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

  hasConnectedClient(): boolean {
    for (const c of this.wss.clients) {
      if (c.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  requestDomSnapshot(timeoutMs = 5000): Promise<{ html: string; url: string; viewport: { width: number; height: number } }> {
    if (!this.hasConnectedClient()) {
      return Promise.reject(new Error("No browser connected to the live-design overlay"));
    }
    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.domRequests.delete(requestId);
        reject(new Error(`DOM snapshot timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.domRequests.set(requestId, { resolve, reject, timer });
      this.broadcast({ type: "dom:request", requestId });
    });
  }

  requestScreenshot(timeoutMs = 15000): Promise<string> {
    if (!this.hasConnectedClient()) {
      return Promise.reject(new Error("No browser connected to the live-design overlay"));
    }
    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.screenshotRequests.delete(requestId);
        reject(new Error(`Screenshot timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.screenshotRequests.set(requestId, { resolve, reject, timer });
      this.broadcast({ type: "screenshot:request", requestId });
    });
  }

  close(): void {
    for (const { timer, reject } of this.domRequests.values()) {
      clearTimeout(timer);
      reject(new Error("WebSocket bridge closed"));
    }
    for (const { timer, reject } of this.screenshotRequests.values()) {
      clearTimeout(timer);
      reject(new Error("WebSocket bridge closed"));
    }
    this.domRequests.clear();
    this.screenshotRequests.clear();
    this.wss.close();
  }
}
