export interface Toolbar {
  element: HTMLDivElement;
  setCommentCount(count: number): void;
  setSelectActive(active: boolean): void;
  setThemeActive(active: boolean): void;
  setCommentsActive(active: boolean): void;
  setFrozen(frozen: boolean): void;
}

export interface ToolbarCallbacks {
  showTheme?: boolean;
  onSelectToggle(): void;
  onThemeToggle(): void;
  onCommentsToggle(): void;
  onSubmit(): void;
}

export function createToolbar(
  shadowRoot: ShadowRoot,
  callbacks: ToolbarCallbacks
): Toolbar {
  const bar = document.createElement("div");
  bar.className = "ld-toolbar";

  // Select mode button
  const selectBtn = document.createElement("button");
  selectBtn.title = "Toggle component selector";
  selectBtn.textContent = "\ud83c\udfaf Select";
  selectBtn.addEventListener("click", callbacks.onSelectToggle);

  // Theme button (only when showTheme is true)
  const themeBtn = document.createElement("button");
  themeBtn.title = "Toggle theme editor";
  themeBtn.textContent = "\ud83c\udfa8 Theme";
  themeBtn.addEventListener("click", callbacks.onThemeToggle);

  // Comments button
  const commentsBtn = document.createElement("button");
  commentsBtn.title = "Toggle comment list";
  const commentsLabel = document.createTextNode("\ud83d\udcac Comments ");
  commentsBtn.appendChild(commentsLabel);

  const badge = document.createElement("span");
  badge.className = "ld-badge";
  badge.textContent = "0";
  badge.style.display = "none";
  commentsBtn.appendChild(badge);
  commentsBtn.addEventListener("click", callbacks.onCommentsToggle);

  // Submit button
  const submitBtn = document.createElement("button");
  submitBtn.title = "Submit review to agent";
  submitBtn.textContent = "\ud83d\udce4 Submit Review";
  submitBtn.addEventListener("click", callbacks.onSubmit);

  // Frozen label (hidden by default)
  const frozenLabel = document.createElement("span");
  frozenLabel.className = "ld-frozen-label";
  frozenLabel.style.display = "none";
  const pulseSpan = document.createElement("span");
  pulseSpan.className = "ld-pulse";
  pulseSpan.textContent = "\u23f3";
  frozenLabel.appendChild(pulseSpan);
  frozenLabel.appendChild(document.createTextNode(" Agent working..."));

  bar.appendChild(selectBtn);
  if (callbacks.showTheme) bar.appendChild(themeBtn);
  bar.appendChild(commentsBtn);
  bar.appendChild(submitBtn);
  bar.appendChild(frozenLabel);

  shadowRoot.appendChild(bar);

  function setCommentCount(count: number): void {
    if (count > 0) {
      badge.textContent = String(count);
      badge.style.display = "";
    } else {
      badge.style.display = "none";
    }
  }

  function setSelectActive(active: boolean): void {
    selectBtn.classList.toggle("active", active);
  }

  function setThemeActive(active: boolean): void {
    themeBtn.classList.toggle("active", active);
  }

  function setCommentsActive(active: boolean): void {
    commentsBtn.classList.toggle("active", active);
  }

  function setFrozen(frozen: boolean): void {
    bar.classList.toggle("frozen", frozen);

    selectBtn.disabled = frozen;
    themeBtn.disabled = frozen;
    commentsBtn.disabled = frozen;
    submitBtn.disabled = frozen;

    frozenLabel.style.display = frozen ? "" : "none";
  }

  return {
    element: bar,
    setCommentCount,
    setSelectActive,
    setThemeActive,
    setCommentsActive,
    setFrozen,
  };
}
