// ── Review session state ──

export type SessionState = "reviewing" | "frozen" | "idle";

export interface ReviewSession {
  id: string;
  state: SessionState;
  comments: Comment[];
  themeChanges: ThemeChange[];
  elementChanges: ElementChange[];
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

// ── Element changes ──

export interface StyleChange {
  property: string;
  oldValue: string;
  newValue: string;
}

export interface ElementChange {
  id: string;
  location: SourceLocation;
  classesAdded: string[];
  classesRemoved: string[];
  styleChanges: StyleChange[];
  timestamp: number;
}

// ── WebSocket messages: Browser → Server ──

export type BrowserMessage =
  | { type: "comment:add"; comment: Omit<Comment, "id" | "timestamp"> }
  | { type: "comment:remove"; commentId: string }
  | { type: "theme:change"; variable: string; value: string }
  | { type: "theme:reset" }
  | { type: "element:change"; change: Omit<ElementChange, "id" | "timestamp"> }
  | { type: "element:reset"; changeId: string }
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
  | { type: "element:changed"; change: ElementChange }
  | { type: "element:reset"; changeId: string }
  | { type: "review:received" }
  | { type: "feedback:requested"; message: string };

// ── MCP tool return types ──

export interface ReviewResult {
  sessionId: string;
  comments: Comment[];
  themeChanges: ThemeChange[];
  elementChanges: ElementChange[];
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
  /** Theme CSS variables to expose in the panel */
  themeVariables?: string[];
  /** Author name shown on comments */
  author?: string;
}

export const DEFAULT_PORT = 24678;
