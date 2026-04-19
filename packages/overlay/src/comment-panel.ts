import type { Comment } from "@live-design/shared";
import type { SelectedComponent } from "./component-selector.js";
import type { WsClient } from "./ws-client.js";

export interface CommentPanel {
  panel: HTMLDivElement;
  showPopover(component: SelectedComponent): void;
  hidePopover(): void;
  addComment(comment: Comment): void;
  removeComment(id: string): void;
  getCount(): number;
  toggle(): boolean;
  close(): void;
  setEnabled(enabled: boolean): void;
}

/** Build outer HTML with only direct children — deep descendants replaced with "…" */
function shallowOuterHtml(el: HTMLElement): string {
  const clone = el.cloneNode(false) as HTMLElement;
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      clone.appendChild(document.createTextNode(child.textContent || ""));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as HTMLElement;
      const stub = childEl.cloneNode(false) as HTMLElement;
      if (childEl.childNodes.length > 0) {
        stub.appendChild(document.createTextNode("…"));
      }
      clone.appendChild(stub);
    }
  }
  return clone.outerHTML;
}

export function createCommentPanel(
  shadowRoot: ShadowRoot,
  ws: WsClient,
  author: string,
  onCountChange: (count: number) => void
): CommentPanel {
  const comments: Comment[] = [];
  let enabled = true;
  let popover: HTMLDivElement | null = null;

  // ── Panel (slide-out list) ──

  const panel = document.createElement("div");
  panel.className = "ld-panel";

  const header = document.createElement("div");
  header.className = "ld-panel-header";

  const title = document.createElement("span");
  title.className = "ld-panel-title";
  title.textContent = "Comments";

  const closeBtn = document.createElement("button");
  closeBtn.className = "ld-panel-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", close);

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const listContainer = document.createElement("div");
  panel.appendChild(listContainer);

  shadowRoot.appendChild(panel);

  function renderList(): void {
    listContainer.innerHTML = "";

    if (comments.length === 0) {
      const empty = document.createElement("div");
      empty.className = "ld-empty";
      empty.textContent = "No comments yet. Select a component to add one.";
      listContainer.appendChild(empty);
      return;
    }

    // Group by component + file:line
    const groups = new Map<string, Comment[]>();
    for (const c of comments) {
      const key = `${c.location.component}|${c.location.file}:${c.location.line}`;
      let list = groups.get(key);
      if (!list) {
        list = [];
        groups.set(key, list);
      }
      list.push(c);
    }

    for (const [, groupComments] of groups) {
      const loc = groupComments[0].location;
      const group = document.createElement("div");
      group.className = "ld-comment-group";

      const groupHeader = document.createElement("div");
      groupHeader.className = "ld-comment-group-header";
      groupHeader.textContent = loc.component;
      group.appendChild(groupHeader);

      const shortFile = loc.file.split("/").slice(-2).join("/");
      const groupLoc = document.createElement("div");
      groupLoc.className = "ld-comment-group-location";
      groupLoc.textContent = `${shortFile}:${loc.line}`;
      group.appendChild(groupLoc);

      for (const c of groupComments) {
        const item = document.createElement("div");
        item.className = "ld-comment-item";

        const text = document.createElement("div");
        text.className = "ld-comment-text";
        text.textContent = c.text;
        item.appendChild(text);

        const meta = document.createElement("div");
        meta.className = "ld-comment-meta";
        const time = new Date(c.timestamp).toLocaleTimeString();
        meta.textContent = `${c.author} \u00b7 ${time}`;
        item.appendChild(meta);

        const removeBtn = document.createElement("button");
        removeBtn.className = "ld-comment-remove";
        removeBtn.textContent = "\u00d7";
        removeBtn.addEventListener("click", () => {
          ws.send({ type: "comment:remove", commentId: c.id });
          removeComment(c.id);
        });
        item.appendChild(removeBtn);

        group.appendChild(item);
      }

      listContainer.appendChild(group);
    }
  }

  // ── Popover (add comment) ──

  function showPopover(component: SelectedComponent): void {
    if (!enabled) return;
    hidePopover();

    const rect = component.element.getBoundingClientRect();
    popover = document.createElement("div");
    popover.className = "ld-popover";

    // Position near the element
    const top = rect.bottom + 8;
    const left = Math.min(rect.left, window.innerWidth - 300);
    popover.style.top = `${top > window.innerHeight - 180 ? rect.top - 180 : top}px`;
    popover.style.left = `${Math.max(8, left)}px`;

    const popTitle = document.createElement("div");
    popTitle.className = "ld-popover-title";
    popTitle.textContent = component.component;
    popover.appendChild(popTitle);

    const shortFile = component.file.split("/").slice(-2).join("/");
    const popLoc = document.createElement("div");
    popLoc.className = "ld-popover-location";
    popLoc.textContent = `${shortFile}:${component.line}`;
    popover.appendChild(popLoc);

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Add a comment...";
    popover.appendChild(textarea);

    const actions = document.createElement("div");
    actions.className = "ld-popover-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "ld-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", hidePopover);

    const addBtn = document.createElement("button");
    addBtn.className = "ld-btn ld-btn-primary";
    addBtn.textContent = "Add Comment";
    addBtn.addEventListener("click", () => {
      const text = textarea.value.trim();
      if (!text) return;
      // Build CSS selector for the DOM element
      const el = component.element;
      let selector = el.tagName.toLowerCase();
      if (el.id) selector += `#${el.id}`;
      if (el.className && typeof el.className === "string") {
        selector += el.className
          .trim()
          .split(/\s+/)
          .map((c) => `.${c}`)
          .join("");
      }

      // Shallow clone: element + direct children only (no deep nesting)
      const elementHtml = shallowOuterHtml(el);

      const componentContext =
        component.props || component.componentTree
          ? {
              props: component.props || {},
              elementHtml,
              componentTree: component.componentTree || [],
              selector,
            }
          : undefined;

      ws.send({
        type: "comment:add",
        comment: {
          location: {
            component: component.component,
            file: component.file,
            line: component.line,
            column: component.column,
          },
          ...(componentContext && { componentContext }),
          text,
          author,
        },
      });
      hidePopover();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(addBtn);
    popover.appendChild(actions);

    shadowRoot.appendChild(popover);

    // Focus textarea on next frame
    requestAnimationFrame(() => textarea.focus());
  }

  function hidePopover(): void {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  function addComment(comment: Comment): void {
    comments.push(comment);
    onCountChange(comments.length);
    renderList();
  }

  function removeComment(id: string): void {
    const idx = comments.findIndex((c) => c.id === id);
    if (idx !== -1) {
      comments.splice(idx, 1);
      onCountChange(comments.length);
      renderList();
    }
  }

  function toggle(): boolean {
    const open = panel.classList.toggle("open");
    if (open) renderList();
    return open;
  }

  function close(): void {
    panel.classList.remove("open");
  }

  function setEnabled(e: boolean): void {
    enabled = e;
    if (!e) hidePopover();
  }

  return {
    panel,
    showPopover,
    hidePopover,
    addComment,
    removeComment,
    getCount: () => comments.length,
    toggle,
    close,
    setEnabled,
  };
}
