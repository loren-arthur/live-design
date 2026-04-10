/** Inject all overlay CSS into a shadow root. */
export function createStyleSheet(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      overflow: visible;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      color: #e0e0e0;
      line-height: 1.4;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    /* ── Toolbar ── */

    .ld-toolbar {
      pointer-events: auto;
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: rgba(15, 15, 15, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
      transition: opacity 0.2s;
    }

    .ld-toolbar.frozen {
      opacity: 0.7;
    }

    .ld-toolbar button {
      pointer-events: auto;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: #ccc;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: background 0.15s, border-color 0.15s;
      white-space: nowrap;
    }

    .ld-toolbar button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .ld-toolbar button.active {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    .ld-toolbar button:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .ld-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background: #3b82f6;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
    }

    .ld-frozen-label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #f59e0b;
      font-size: 12px;
      padding: 0 8px;
    }

    @keyframes ld-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    .ld-frozen-label .ld-pulse {
      animation: ld-pulse 1.8s ease-in-out infinite;
    }

    /* ── Panels (shared) ── */

    .ld-panel {
      pointer-events: none;
      position: fixed;
      top: 0;
      right: 0;
      width: 340px;
      height: 100%;
      background: rgba(15, 15, 15, 0.95);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform 0.25s ease;
      padding: 16px;
    }

    .ld-panel.open {
      pointer-events: auto;
      transform: translateX(0);
    }

    .ld-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .ld-panel-title {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
    }

    .ld-panel-close {
      pointer-events: auto;
      background: transparent;
      border: none;
      color: #888;
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: inherit;
    }

    .ld-panel-close:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ccc;
    }

    /* ── Comment popover ── */

    .ld-popover {
      pointer-events: auto;
      position: fixed;
      width: 280px;
      background: rgba(15, 15, 15, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .ld-popover-title {
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 2px;
    }

    .ld-popover-location {
      font-size: 11px;
      color: #888;
      margin-bottom: 8px;
    }

    .ld-popover textarea {
      width: 100%;
      height: 64px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      color: #e0e0e0;
      padding: 8px;
      font-size: 12px;
      font-family: inherit;
      resize: vertical;
    }

    .ld-popover textarea:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .ld-popover-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 8px;
    }

    /* ── Buttons ── */

    .ld-btn {
      pointer-events: auto;
      padding: 5px 12px;
      border-radius: 5px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.06);
      color: #ccc;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s;
    }

    .ld-btn:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .ld-btn-primary {
      background: #3b82f6;
      border-color: #2563eb;
      color: #fff;
    }

    .ld-btn-primary:hover {
      background: #2563eb;
    }

    /* ── Comment list ── */

    .ld-comment-group {
      margin-bottom: 16px;
    }

    .ld-comment-group-header {
      font-size: 12px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 4px;
    }

    .ld-comment-group-location {
      font-size: 11px;
      color: #666;
      margin-bottom: 8px;
    }

    .ld-comment-item {
      position: relative;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      margin-bottom: 6px;
    }

    .ld-comment-text {
      font-size: 12px;
      color: #ddd;
      margin-bottom: 4px;
      word-break: break-word;
    }

    .ld-comment-meta {
      font-size: 10px;
      color: #666;
    }

    .ld-comment-remove {
      pointer-events: auto;
      position: absolute;
      top: 6px;
      right: 6px;
      background: transparent;
      border: none;
      color: #666;
      font-size: 14px;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: inherit;
      line-height: 1;
    }

    .ld-comment-remove:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .ld-empty {
      color: #666;
      font-size: 12px;
      text-align: center;
      padding: 24px 0;
    }

    /* ── Radix theme panel ── */

    .ld-radix-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .ld-radix-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ld-radix-label {
      font-size: 11px;
      font-weight: 600;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .ld-radix-accent-grid {
      display: grid;
      grid-template-columns: repeat(13, 1fr);
      gap: 4px;
    }

    .ld-radix-swatch {
      pointer-events: auto;
      width: 100%;
      aspect-ratio: 1;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
      transition: transform 0.1s ease, border-color 0.1s ease;
    }

    .ld-radix-swatch:hover {
      transform: scale(1.15);
      border-color: rgba(255, 255, 255, 0.4);
    }

    .ld-radix-swatch.active {
      border-color: #fff;
      border-width: 2px;
    }

    .ld-radix-select {
      pointer-events: auto;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      color: #e0e0e0;
      padding: 5px 8px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
    }

    .ld-radix-select:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .ld-radix-toggle {
      display: flex;
      gap: 4px;
    }

    .ld-radix-toggle-btn {
      pointer-events: auto;
      flex: 1;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      color: #aaa;
      padding: 5px 10px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      text-transform: capitalize;
      transition: background 0.1s, color 0.1s;
    }

    .ld-radix-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ddd;
    }

    .ld-radix-toggle-btn.active {
      background: #3b82f6;
      border-color: #2563eb;
      color: #fff;
    }

    .ld-theme-reset {
      margin-top: 14px;
    }

    .ld-radix-divider {
      font-size: 11px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-top: 12px;
      margin-top: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .ld-radix-color-input {
      pointer-events: auto;
      width: 36px;
      height: 28px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      padding: 1px;
    }

    .ld-radix-range {
      pointer-events: auto;
      width: 100%;
      accent-color: #3b82f6;
    }

    .ld-radix-text-input {
      pointer-events: auto;
      width: 100%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      color: #e0e0e0;
      padding: 5px 8px;
      font-size: 12px;
      font-family: inherit;
    }

    .ld-radix-text-input:focus {
      outline: none;
      border-color: #3b82f6;
    }

    /* ── Selector highlight ── */

    .ld-highlight {
      position: fixed;
      pointer-events: none;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.08);
      border-radius: 3px;
      transition: all 0.1s ease;
      z-index: 999998;
    }

    .ld-tooltip {
      position: fixed;
      pointer-events: none;
      background: rgba(15, 15, 15, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 5px;
      padding: 4px 8px;
      font-size: 11px;
      color: #e0e0e0;
      white-space: nowrap;
      z-index: 999998;
    }

    .ld-tooltip strong {
      color: #3b82f6;
    }

    /* ── Submit dialog ── */

    .ld-dialog-backdrop {
      pointer-events: auto;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ld-dialog {
      background: rgba(20, 20, 20, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 24px;
      width: 400px;
      max-width: 90vw;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    }

    .ld-dialog h2 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 4px;
    }

    .ld-dialog .ld-summary {
      font-size: 12px;
      color: #888;
      margin-bottom: 16px;
    }

    .ld-dialog label {
      display: block;
      font-size: 12px;
      color: #aaa;
      margin-bottom: 4px;
    }

    .ld-dialog input[type="text"],
    .ld-dialog textarea {
      width: 100%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      color: #e0e0e0;
      padding: 8px 10px;
      font-size: 13px;
      font-family: inherit;
      margin-bottom: 12px;
    }

    .ld-dialog textarea {
      height: 80px;
      resize: vertical;
    }

    .ld-dialog input:focus,
    .ld-dialog textarea:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .ld-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    /* ── Freeze banner ── */

    .ld-freeze-banner {
      pointer-events: auto;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      padding: 10px 16px;
      background: rgba(245, 158, 11, 0.15);
      border-bottom: 1px solid rgba(245, 158, 11, 0.3);
      color: #f59e0b;
      font-size: 13px;
      font-weight: 500;
      text-align: center;
      backdrop-filter: blur(8px);
    }

    /* ── Toast ── */

    .ld-toast {
      pointer-events: auto;
      position: fixed;
      top: 16px;
      right: 16px;
      max-width: 360px;
      padding: 12px 16px;
      background: rgba(15, 15, 15, 0.95);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 13px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      animation: ld-slide-in 0.3s ease;
    }

    @keyframes ld-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    @keyframes ld-slide-out {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }

    .ld-toast.dismissing {
      animation: ld-slide-out 0.3s ease forwards;
    }
  `;
  return style;
}
