import { randomUUID } from "node:crypto";
import type {
  ReviewSession,
  Comment,
  ReviewResult,
  SessionState,
} from "@live-design/shared";

interface ReviewWaiter {
  resolve: (result: ReviewResult) => void;
}

export class SessionManager {
  private session: ReviewSession | null = null;
  private waiter: ReviewWaiter | null = null;
  private lastAuthor: string = "designer";

  startSession(): ReviewSession {
    if (this.session && this.session.state === "reviewing") {
      return this.session;
    }

    this.session = {
      id: randomUUID(),
      state: "reviewing",
      comments: [],
      themeChanges: [],
      feedback: null,
      startedAt: Date.now(),
      submittedAt: null,
    };

    return this.session;
  }

  addComment(comment: Omit<Comment, "id" | "timestamp">): Comment {
    if (!this.session) {
      this.startSession();
    }

    const full: Comment = {
      ...comment,
      id: randomUUID(),
      timestamp: Date.now(),
    };

    this.session!.comments.push(full);
    return full;
  }

  removeComment(id: string): boolean {
    if (!this.session) return false;

    const idx = this.session.comments.findIndex((c) => c.id === id);
    if (idx === -1) return false;

    this.session.comments.splice(idx, 1);
    return true;
  }

  recordThemeChange(
    variable: string,
    oldValue: string,
    newValue: string,
  ): void {
    if (!this.session) {
      this.startSession();
    }

    const existing = this.session!.themeChanges.findIndex(
      (tc) => tc.variable === variable,
    );

    if (existing !== -1) {
      this.session!.themeChanges[existing] = { variable, oldValue, newValue };
    } else {
      this.session!.themeChanges.push({ variable, oldValue, newValue });
    }
  }

  clearThemeChanges(): void {
    if (!this.session) return;
    this.session.themeChanges = [];
  }

  submitReview(feedback: string, author: string): ReviewResult | null {
    if (!this.session) return null;

    this.session.state = "frozen";
    this.session.feedback = feedback;
    this.session.submittedAt = Date.now();
    this.lastAuthor = author;

    const result: ReviewResult = {
      sessionId: this.session.id,
      comments: [...this.session.comments],
      themeChanges: [...this.session.themeChanges],
      feedback,
      author,
      submittedAt: this.session.submittedAt,
    };

    if (this.waiter) {
      this.waiter.resolve(result);
      this.waiter = null;
    }

    return result;
  }

  requestFeedback(
    message: string,
    resolvedComments?: string[],
  ): void {
    if (!this.session) {
      this.startSession();
    }

    // Remove resolved comments
    if (resolvedComments && resolvedComments.length > 0) {
      this.session!.comments = this.session!.comments.filter(
        (c) => !resolvedComments.includes(c.id),
      );
    }

    this.session!.state = "reviewing";
    this.session!.feedback = null;
    this.session!.submittedAt = null;
  }

  waitForReview(): Promise<ReviewResult> {
    if (!this.session) {
      this.startSession();
    }

    // If the session was already submitted (frozen with feedback), return immediately
    if (
      this.session!.state === "frozen" &&
      this.session!.feedback !== null &&
      this.session!.submittedAt !== null
    ) {
      const result: ReviewResult = {
        sessionId: this.session!.id,
        comments: [...this.session!.comments],
        themeChanges: [...this.session!.themeChanges],
        feedback: this.session!.feedback,
        author: this.lastAuthor,
        submittedAt: this.session!.submittedAt,
      };
      return Promise.resolve(result);
    }

    return new Promise<ReviewResult>((resolve) => {
      this.waiter = { resolve };
    });
  }

  getState(): { session: ReviewSession | null; state: SessionState } {
    return {
      session: this.session ? { ...this.session } : null,
      state: this.session?.state ?? "idle",
    };
  }
}
