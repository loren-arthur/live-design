import type { LiveDesignConfig } from "@live-design/shared";
import { DEFAULT_PORT } from "@live-design/shared";
import { WsClient } from "./ws-client.js";
import { createStyleSheet } from "./styles.js";
import { initSelector } from "./component-selector.js";
import { createCommentPanel } from "./comment-panel.js";
import { createThemePanel } from "./theme-panel.js";
import { createElementInspector } from "./element-inspector.js";
import { createStylesheetIndex } from "./stylesheet-index.js";
import { createToolbar } from "./toolbar.js";
import { createSubmitDialog } from "./submit-dialog.js";
import { createFreezeController } from "./freeze.js";

async function loadConfig(): Promise<LiveDesignConfig> {
  try {
    // Virtual module served by the Vite plugin at runtime.
    // Use a variable so TypeScript does not attempt to resolve the specifier.
    const specifier = "/@live-design/config.js";
    const mod = await import(/* @vite-ignore */ specifier);
    return (mod.default ?? mod) as LiveDesignConfig;
  } catch {
    return {};
  }
}

async function init(): Promise<void> {
  const config = await loadConfig();
  const port = config.port ?? DEFAULT_PORT;
  const author = config.author ?? "Reviewer";

  // Create shadow DOM host
  const host = document.createElement("div");
  host.id = "live-design-overlay";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "100%";
  host.style.height = "100%";
  host.style.zIndex = "999999";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  shadowRoot.appendChild(createStyleSheet());

  // WebSocket client
  const ws = new WsClient(port);

  // Freeze controller
  let frozen = false;
  const freezeCtl = createFreezeController(shadowRoot, (isFrozen) => {
    frozen = isFrozen;
    toolbar.setFrozen(isFrozen);
    commentPanel.setEnabled(!isFrozen);
    themePanel.setEnabled(!isFrozen);
    inspector.setEnabled(!isFrozen);
  });

  // Comment panel
  const commentPanel = createCommentPanel(shadowRoot, ws, author, (count) => {
    toolbar.setCommentCount(count);
  });

  // Theme panel
  const themePanel = createThemePanel(shadowRoot, ws, config.themeVariables);

  // Stylesheet index + element inspector
  const stylesheetIndex = createStylesheetIndex();
  const inspector = createElementInspector(shadowRoot, ws, stylesheetIndex);

  // Submit dialog
  const submitDialog = createSubmitDialog(shadowRoot, ws, author);

  // Component selector
  const selector = initSelector(shadowRoot, (component) => {
    if (frozen) return;
    commentPanel.showPopover(component);
    inspector.inspect(component);
  });

  // Toolbar
  const toolbar = createToolbar(shadowRoot, {
    onSelectToggle() {
      if (frozen) return;
      const active = selector.toggle();
      toolbar.setSelectActive(active);
    },
    onThemeToggle() {
      if (frozen) return;
      commentPanel.close();
      inspector.close();
      const active = themePanel.toggle();
      toolbar.setThemeActive(active);
      toolbar.setCommentsActive(false);
      toolbar.setInspectorActive(false);
    },
    onInspectorToggle() {
      if (frozen) return;
      themePanel.close();
      commentPanel.close();
      const active = inspector.toggle();
      toolbar.setInspectorActive(active);
      toolbar.setThemeActive(false);
      toolbar.setCommentsActive(false);
    },
    onCommentsToggle() {
      if (frozen) return;
      themePanel.close();
      inspector.close();
      const active = commentPanel.toggle();
      toolbar.setCommentsActive(active);
      toolbar.setThemeActive(false);
      toolbar.setInspectorActive(false);
    },
    onSubmit() {
      if (frozen) return;
      submitDialog.open(
        commentPanel.getCount(),
        themePanel.getChangeCount()
      );
    },
  });

  // ── WebSocket message handlers ──

  ws.on("session:state", (msg) => {
    if (msg.state === "frozen") {
      freezeCtl.freeze();
    } else {
      freezeCtl.unfreeze();
    }
  });

  ws.on("feedback:requested", (msg) => {
    freezeCtl.unfreeze(msg.message);
  });

  ws.on("comment:added", (msg) => {
    commentPanel.addComment(msg.comment);
  });

  ws.on("comment:removed", (msg) => {
    commentPanel.removeComment(msg.commentId);
  });

  // ── Keyboard shortcuts ──

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      commentPanel.close();
      commentPanel.hidePopover();
      themePanel.close();
      inspector.close();
      submitDialog.close();
      toolbar.setThemeActive(false);
      toolbar.setCommentsActive(false);
      toolbar.setInspectorActive(false);
    }
  });
}

// Boot
init().catch((err) => {
  console.error("[live-design] Overlay initialization failed:", err);
});
