import type { LiveDesignConfig } from "@live-design/shared";
import { DEFAULT_PORT } from "@live-design/shared";
import { WsClient } from "./ws-client.js";
import { createStyleSheet } from "./styles.js";
import { initSelector } from "./component-selector.js";
import { createCommentPanel } from "./comment-panel.js";
import { createThemePanel, findRadixRoot } from "./theme-panel.js";
import { createToolbar } from "./toolbar.js";
import { createSubmitDialog } from "./submit-dialog.js";
import { createFreezeController } from "./freeze.js";
import { captureDom, captureScreenshot } from "./capture.js";
import { initConsoleCollector } from "./console-collector.js";

const OVERLAY_HOST_ID = "live-design-overlay";

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
  // Start collecting console errors/warnings as early as possible
  initConsoleCollector();

  const config = await loadConfig();
  const port = config.port ?? DEFAULT_PORT;
  const author = config.author ?? "Reviewer";

  // Create shadow DOM host
  const host = document.createElement("div");
  host.id = OVERLAY_HOST_ID;
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "0";
  host.style.height = "0";
  host.style.overflow = "visible";
  host.style.zIndex = "999999";
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  shadowRoot.appendChild(createStyleSheet());

  // WebSocket client
  const ws = new WsClient(port);

  // Detect Radix Themes — only show the Theme button if found
  const hasRadix = findRadixRoot() !== null;

  // Freeze controller
  let frozen = false;
  const freezeCtl = createFreezeController(shadowRoot, (isFrozen) => {
    frozen = isFrozen;
    toolbar.setFrozen(isFrozen);
    commentPanel.setEnabled(!isFrozen);
    if (themePanel) themePanel.setEnabled(!isFrozen);
  });

  // Comment panel
  const commentPanel = createCommentPanel(shadowRoot, ws, author, (count) => {
    toolbar.setCommentCount(count);
  });

  // Theme panel (only when Radix is detected)
  const themePanel = hasRadix ? createThemePanel(shadowRoot, ws, config.themeVariables) : null;

  // Submit dialog
  const submitDialog = createSubmitDialog(shadowRoot, ws, author);

  // Component selector
  const selector = initSelector(shadowRoot, (component) => {
    if (frozen) return;
    selector.disable();
    toolbar.setSelectActive(false);
    commentPanel.showPopover(component);
  });

  // Toolbar
  const toolbar = createToolbar(shadowRoot, {
    showTheme: hasRadix,
    onSelectToggle() {
      if (frozen) return;
      const active = selector.toggle();
      toolbar.setSelectActive(active);
    },
    onThemeToggle() {
      if (frozen || !themePanel) return;
      commentPanel.close();
      const active = themePanel.toggle();
      toolbar.setThemeActive(active);
      toolbar.setCommentsActive(false);
    },
    onCommentsToggle() {
      if (frozen) return;
      if (themePanel) themePanel.close();
      const active = commentPanel.toggle();
      toolbar.setCommentsActive(active);
      toolbar.setThemeActive(false);
    },
    onSubmit() {
      if (frozen) return;
      submitDialog.open(
        commentPanel.getCount(),
        themePanel?.getChangeCount() ?? 0
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

  ws.on("dom:request", (msg) => {
    const snapshot = captureDom(OVERLAY_HOST_ID);
    ws.send({
      type: "dom:snapshot",
      requestId: msg.requestId,
      html: snapshot.html,
      url: snapshot.url,
      viewport: snapshot.viewport,
    });
  });

  ws.on("screenshot:request", async (msg) => {
    try {
      const dataUrl = await captureScreenshot(OVERLAY_HOST_ID);
      ws.send({
        type: "screenshot:result",
        requestId: msg.requestId,
        dataUrl,
      });
    } catch (err) {
      ws.send({
        type: "screenshot:error",
        requestId: msg.requestId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // ── Keyboard shortcuts ──

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      commentPanel.close();
      commentPanel.hidePopover();
      if (themePanel) themePanel.close();
      submitDialog.close();
      toolbar.setThemeActive(false);
      toolbar.setCommentsActive(false);
    }
  });
}

// Boot
init().catch((err) => {
  console.error("[live-design] Overlay initialization failed:", err);
});
