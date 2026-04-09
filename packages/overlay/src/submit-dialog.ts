import type { WsClient } from "./ws-client.js";

export interface SubmitDialog {
  open(commentCount: number, themeChangeCount: number): void;
  close(): void;
}

export function createSubmitDialog(
  shadowRoot: ShadowRoot,
  ws: WsClient,
  author: string
): SubmitDialog {
  let backdrop: HTMLDivElement | null = null;

  function open(commentCount: number, themeChangeCount: number): void {
    close();

    backdrop = document.createElement("div");
    backdrop.className = "ld-dialog-backdrop";
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });

    const dialog = document.createElement("div");
    dialog.className = "ld-dialog";

    const heading = document.createElement("h2");
    heading.textContent = "Submit Review";
    dialog.appendChild(heading);

    const parts: string[] = [];
    if (commentCount > 0) {
      parts.push(`${commentCount} comment${commentCount !== 1 ? "s" : ""}`);
    }
    if (themeChangeCount > 0) {
      parts.push(
        `${themeChangeCount} theme change${themeChangeCount !== 1 ? "s" : ""}`
      );
    }

    const summary = document.createElement("div");
    summary.className = "ld-summary";
    summary.textContent = parts.length > 0 ? parts.join(", ") : "No changes";
    dialog.appendChild(summary);

    // Author field
    const authorLabel = document.createElement("label");
    authorLabel.textContent = "Author";
    dialog.appendChild(authorLabel);

    const authorInput = document.createElement("input");
    authorInput.type = "text";
    authorInput.value = author;
    dialog.appendChild(authorInput);

    // Feedback field
    const feedbackLabel = document.createElement("label");
    feedbackLabel.textContent = "What should the agent focus on?";
    dialog.appendChild(feedbackLabel);

    const feedbackArea = document.createElement("textarea");
    feedbackArea.placeholder = "Describe what you want changed...";
    dialog.appendChild(feedbackArea);

    // Actions
    const actions = document.createElement("div");
    actions.className = "ld-dialog-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "ld-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", close);

    const submitBtn = document.createElement("button");
    submitBtn.className = "ld-btn ld-btn-primary";
    submitBtn.textContent = "Submit Review";
    submitBtn.addEventListener("click", () => {
      const feedback = feedbackArea.value.trim();
      const reviewAuthor = authorInput.value.trim() || "Anonymous";

      ws.send({
        type: "review:submit",
        feedback,
        author: reviewAuthor,
      });

      close();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(submitBtn);
    dialog.appendChild(actions);

    backdrop.appendChild(dialog);
    shadowRoot.appendChild(backdrop);

    requestAnimationFrame(() => feedbackArea.focus());
  }

  function close(): void {
    if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
  }

  return { open, close };
}
