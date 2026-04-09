/** Inject all overlay CSS into a shadow root. */
export function createStyleSheet(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 999999;
      pointer-events: none;
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
      pointer-events: auto;
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

    /* ── Theme panel ── */

    .ld-theme-var {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .ld-theme-var label {
      flex: 1;
      font-size: 11px;
      color: #aaa;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ld-theme-var input[type="color"] {
      pointer-events: auto;
      width: 28px;
      height: 28px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      padding: 1px;
    }

    .ld-theme-var input[type="text"],
    .ld-theme-var input[type="range"] {
      pointer-events: auto;
      width: 80px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      color: #e0e0e0;
      padding: 4px 6px;
      font-size: 11px;
      font-family: inherit;
    }

    .ld-theme-var input[type="text"]:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .ld-color-swatch {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }

    .ld-theme-reset {
      margin-top: 12px;
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

    /* ── Element Inspector ── */

    .inspector-panel {
      pointer-events: auto;
      position: fixed;
      top: 0;
      right: 0;
      width: 320px;
      height: 100%;
      background: rgba(15, 15, 15, 0.92);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform 0.25s ease;
      padding: 0;
      z-index: 999999;
    }

    .inspector-panel.open {
      transform: translateX(0);
    }

    .inspector-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .inspector-header-name {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    .inspector-header-loc {
      font-size: 11px;
      color: #888;
      margin-top: 2px;
    }

    .inspector-body {
      padding: 0 16px 16px;
    }

    .inspector-section {
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 8px;
      margin-bottom: 4px;
    }

    .inspector-section:last-child {
      border-bottom: none;
    }

    .inspector-section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 0 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      user-select: none;
    }

    .inspector-section-title:hover {
      color: #ccc;
    }

    .inspector-arrow {
      font-size: 10px;
      width: 12px;
      text-align: center;
      color: #666;
    }

    .inspector-section-body {
      /* no extra styling needed, just a wrapper */
    }

    /* ── Class tags ── */

    .class-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 8px;
    }

    .class-tag {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      font-size: 11px;
      color: #93b4f5;
      animation: ld-fade-in 0.15s ease;
    }

    @keyframes ld-fade-in {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }

    .class-tag-remove {
      pointer-events: auto;
      background: transparent;
      border: none;
      color: #6b8fd4;
      font-size: 12px;
      cursor: pointer;
      padding: 0 1px;
      line-height: 1;
      border-radius: 2px;
      font-family: inherit;
    }

    .class-tag-remove:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
    }

    /* ── Class add ── */

    .class-add {
      position: relative;
      margin-top: 4px;
    }

    .class-add-btn {
      font-size: 13px;
      padding: 2px 10px;
    }

    .class-search-wrap {
      margin-top: 6px;
    }

    .class-search {
      pointer-events: auto;
      width: 100%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      color: #e0e0e0;
      padding: 6px 8px;
      font-size: 12px;
      font-family: inherit;
    }

    .class-search:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .class-dropdown {
      margin-top: 4px;
      max-height: 200px;
      overflow-y: auto;
      background: rgba(20, 20, 20, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .class-dropdown-item {
      pointer-events: auto;
      padding: 6px 10px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 1px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      transition: background 0.1s;
    }

    .class-dropdown-item:last-child {
      border-bottom: none;
    }

    .class-dropdown-item:hover {
      background: rgba(59, 130, 246, 0.12);
    }

    .class-dropdown-item.class-dropdown-empty {
      color: #666;
      font-size: 11px;
      cursor: default;
    }

    .class-dropdown-item.class-dropdown-empty:hover {
      background: transparent;
    }

    .class-dropdown-name {
      font-size: 12px;
      color: #e0e0e0;
    }

    .class-dropdown-props {
      font-size: 10px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Style rows ── */

    .style-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      min-height: 26px;
    }

    .style-label {
      flex: 0 0 100px;
      font-size: 11px;
      color: #888;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .style-value {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .style-color-swatch {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }

    .style-color-input {
      pointer-events: auto;
      width: 28px;
      height: 24px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      padding: 1px;
      flex-shrink: 0;
    }

    .style-slider {
      pointer-events: auto;
      width: 80px;
      flex-shrink: 0;
      accent-color: #3b82f6;
    }

    .style-text-input {
      pointer-events: auto;
      flex: 1;
      min-width: 0;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      color: #e0e0e0;
      padding: 3px 6px;
      font-size: 11px;
      font-family: inherit;
    }

    .style-text-input:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .style-text-input:disabled,
    .style-color-input:disabled,
    .style-slider:disabled {
      opacity: 0.4;
      cursor: default;
    }
  `;
  return style;
}
