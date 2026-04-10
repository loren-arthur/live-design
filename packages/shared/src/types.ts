// ── Review session state ──

export type SessionState = "reviewing" | "frozen" | "idle";

export interface ReviewSession {
  id: string;
  state: SessionState;
  comments: Comment[];
  themeChanges: ThemeChange[];
  feedback: string | null;
  startedAt: number;
  submittedAt: number | null;
}

// ── Comments ──

export interface SourceLocation {
  file: string;
  line: number;
  column?: number;
  component: string;
}

export interface Comment {
  id: string;
  location: SourceLocation;
  text: string;
  author: string;
  timestamp: number;
}

// ── Theme ──

export interface ThemeChange {
  variable: string;
  oldValue: string;
  newValue: string;
}

// ── WebSocket messages: Browser → Server ──

export type BrowserMessage =
  | { type: "comment:add"; comment: Omit<Comment, "id" | "timestamp"> }
  | { type: "comment:remove"; commentId: string }
  | { type: "theme:change"; variable: string; value: string }
  | { type: "theme:reset" }
  | { type: "review:submit"; feedback: string; author: string }
  | { type: "session:ping" };

// ── WebSocket messages: Server → Browser ──

export type ServerMessage =
  | { type: "session:state"; state: SessionState; message?: string }
  | { type: "session:started"; sessionId: string }
  | { type: "comment:added"; comment: Comment }
  | { type: "comment:removed"; commentId: string }
  | { type: "theme:applied"; variable: string; value: string }
  | { type: "theme:cleared" }
  | { type: "review:received" }
  | { type: "feedback:requested"; message: string };

// ── MCP tool return types ──

export interface ReviewResult {
  sessionId: string;
  comments: Comment[];
  themeChanges: ThemeChange[];
  feedback: string;
  author: string;
  submittedAt: number;
}

export interface FeedbackRequest {
  message: string;
  resolvedComments?: string[];
}

// ── Config ──

export interface LiveDesignConfig {
  /** WebSocket port for browser ↔ server bridge */
  port?: number;
  /** Author name shown on comments */
  author?: string;
  /** Custom CSS variables to expose in the theme panel alongside Radix props */
  themeVariables?: string[];
}

export const DEFAULT_PORT = 24678;
