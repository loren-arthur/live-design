export interface SelectedComponent {
  element: HTMLElement;
  component: string;
  file: string;
  line: number;
  column?: number;
}

interface FiberNode {
  _debugSource?: { fileName: string; lineNumber: number; columnNumber?: number };
  type?: { displayName?: string; name?: string };
  elementType?: { name?: string };
  return?: FiberNode | null;
}

function getFiberFromElement(el: Element): FiberNode | null {
  for (const key of Object.keys(el)) {
    if (key.startsWith("__reactFiber$")) {
      return (el as unknown as Record<string, unknown>)[key] as FiberNode;
    }
  }
  return null;
}

function findSourceFiber(
  fiber: FiberNode
): { source: NonNullable<FiberNode["_debugSource"]>; name: string } | null {
  let current: FiberNode | null | undefined = fiber;
  while (current) {
    if (current._debugSource) {
      const name =
        current.type?.displayName ||
        current.type?.name ||
        current.elementType?.name ||
        "Unknown";
      return { source: current._debugSource, name };
    }
    current = current.return;
  }
  return null;
}

interface SelectorControls {
  enable(): void;
  disable(): void;
  toggle(): boolean;
}

export function initSelector(
  shadowRoot: ShadowRoot,
  onSelect: (component: SelectedComponent) => void
): SelectorControls {
  let highlight: HTMLDivElement | null = null;
  let tooltip: HTMLDivElement | null = null;
  let active = false;
  let selecting = false;

  function ensureHighlight(): HTMLDivElement {
    if (!highlight) {
      highlight = document.createElement("div");
      highlight.className = "ld-highlight";
      shadowRoot.appendChild(highlight);
    }
    return highlight;
  }

  function ensureTooltip(): HTMLDivElement {
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "ld-tooltip";
      shadowRoot.appendChild(tooltip);
    }
    return tooltip;
  }

  function hideOverlays(): void {
    if (highlight) {
      highlight.remove();
      highlight = null;
    }
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!selecting) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || !(el instanceof HTMLElement)) {
      hideOverlays();
      return;
    }

    const fiber = getFiberFromElement(el);
    if (!fiber) {
      hideOverlays();
      return;
    }

    const info = findSourceFiber(fiber);
    if (!info) {
      hideOverlays();
      return;
    }

    const rect = el.getBoundingClientRect();
    const h = ensureHighlight();
    h.style.top = `${rect.top}px`;
    h.style.left = `${rect.left}px`;
    h.style.width = `${rect.width}px`;
    h.style.height = `${rect.height}px`;

    const shortFile = info.source.fileName.split("/").slice(-2).join("/");
    const t = ensureTooltip();
    t.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = info.name;
    t.appendChild(strong);
    t.appendChild(
      document.createTextNode(` \u2014 ${shortFile}:${info.source.lineNumber}`)
    );

    const tooltipTop = rect.top - 30;
    t.style.top = `${tooltipTop < 4 ? rect.bottom + 6 : tooltipTop}px`;
    t.style.left = `${Math.min(e.clientX + 12, window.innerWidth - 240)}px`;
  }

  function handleClick(e: MouseEvent): void {
    if (!selecting) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || !(el instanceof HTMLElement)) return;

    const fiber = getFiberFromElement(el);
    if (!fiber) return;

    const info = findSourceFiber(fiber);
    if (!info) return;

    e.preventDefault();
    e.stopPropagation();

    onSelect({
      element: el,
      component: info.name,
      file: info.source.fileName,
      line: info.source.lineNumber,
      column: info.source.columnNumber,
    });

    hideOverlays();
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (active && (e.metaKey || e.ctrlKey)) {
      selecting = true;
    }
  }

  function handleKeyUp(e: KeyboardEvent): void {
    if (!e.metaKey && !e.ctrlKey) {
      selecting = false;
      hideOverlays();
    }
  }

  function enable(): void {
    if (active) return;
    active = true;
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
  }

  function disable(): void {
    active = false;
    selecting = false;
    hideOverlays();
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    document.removeEventListener("keyup", handleKeyUp, true);
  }

  function toggle(): boolean {
    if (active) {
      disable();
    } else {
      enable();
    }
    return active;
  }

  return { enable, disable, toggle };
}
