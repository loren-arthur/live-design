export interface SelectedComponent {
  element: HTMLElement;
  component: string;
  file: string;
  line: number;
  column?: number;
}

interface FiberNode {
  _debugSource?: { fileName: string; lineNumber: number; columnNumber?: number };
  _debugStack?: { stack?: string };
  type?: { displayName?: string; name?: string } | string;
  elementType?: { name?: string };
  return?: FiberNode | null;
}

interface ComponentInfo {
  name: string;
  file: string;
  line: number;
  column?: number;
}

function getFiberFromElement(el: Element): FiberNode | null {
  for (const key of Object.keys(el)) {
    if (key.startsWith("__reactFiber$")) {
      return (el as unknown as Record<string, unknown>)[key] as FiberNode;
    }
  }
  return null;
}

// Parse source location from React 19's _debugStack stack trace.
// Stack lines look like: "    at Hero (http://localhost:5173/src/components/Hero.tsx:5:18)"
const STACK_FRAME_RE = /at\s+(\S+)\s+\((https?:\/\/.+?):(\d+):(\d+)\)/;
// Also match anonymous frames: "    at http://localhost:5173/src/components/Features.tsx:152:29"
const STACK_FRAME_ANON_RE = /at\s+(https?:\/\/.+?):(\d+):(\d+)/;

// ── Minimal VLQ source-map line decoder ──
const VLQ_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function decodeVLQ(encoded: string): number[] {
  const values: number[] = [];
  let shift = 0, value = 0;
  for (const c of encoded) {
    let digit = VLQ_CHARS.indexOf(c);
    if (digit === -1) continue;
    const cont = digit & 32;
    digit &= 31;
    value += digit << shift;
    if (cont) { shift += 5; continue; }
    values.push(value & 1 ? -(value >> 1) : value >> 1);
    shift = 0; value = 0;
  }
  return values;
}

interface SourceMapData {
  mappings: string;
  sources: string[];
}

// Cache fetched source maps by URL (without query string)
const sourceMapCache = new Map<string, Promise<SourceMapData | null>>();

async function fetchSourceMap(url: string): Promise<SourceMapData | null> {
  // Strip query params for cache key
  const baseUrl = url.replace(/\?.*$/, "");
  const cached = sourceMapCache.get(baseUrl);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const text = await resp.text();
      // Look for inline source map
      const match = text.match(/\/\/# sourceMappingURL=data:application\/json;base64,(.+)$/m);
      if (!match) return null;
      const json = JSON.parse(atob(match[1]));
      return { mappings: json.mappings, sources: json.sources } as SourceMapData;
    } catch {
      return null;
    }
  })();

  sourceMapCache.set(baseUrl, promise);
  return promise;
}

function resolveOriginalLine(map: SourceMapData, genLine: number, genCol: number): { file: string; line: number; column: number } | null {
  const groups = map.mappings.split(";");
  let sourceLine = 0;
  let sourceCol = 0;
  let sourceIdx = 0;

  // Walk through mapping groups (each group = one generated line)
  for (let gi = 0; gi < groups.length && gi < genLine; gi++) {
    const group = groups[gi];
    if (!group) continue;
    const segments = group.split(",");
    let genColOffset = 0;
    for (const seg of segments) {
      const fields = decodeVLQ(seg);
      if (fields.length < 4) continue;
      genColOffset += fields[0];
      sourceIdx += fields[1];
      sourceLine += fields[2];
      sourceCol += fields[3];

      // Match: we're on the right generated line and at/past the right column
      if (gi === genLine - 1 && genColOffset >= genCol - 1) {
        return {
          file: map.sources[sourceIdx] || "",
          line: sourceLine + 1, // 0-indexed to 1-indexed
          column: sourceCol + 1,
        };
      }
    }
  }

  // If we didn't find an exact column match, return the last mapping on that line
  return {
    file: map.sources[sourceIdx] || "",
    line: sourceLine + 1,
    column: sourceCol + 1,
  };
}

async function parseStackSource(stack: string): Promise<{ name: string; file: string; line: number; column: number } | null> {
  for (const line of stack.split("\n")) {
    let name: string, url: string, lineStr: string, colStr: string;
    const m = line.match(STACK_FRAME_RE);
    if (m) {
      [, name, url, lineStr, colStr] = m;
    } else {
      const m2 = line.match(STACK_FRAME_ANON_RE);
      if (!m2) continue;
      [, url, lineStr, colStr] = m2;
      name = "";
    }
    // Skip internal React/library frames
    if (url.includes("/node_modules/")) continue;

    const genLine = Number(lineStr);
    const genCol = Number(colStr);

    // Extract file path from URL (strip origin)
    const pathStart = url.indexOf("/", url.indexOf("://") + 3);
    const filePath = pathStart !== -1 ? url.slice(pathStart) : url;

    // Try to resolve via source map for accurate line numbers
    const map = await fetchSourceMap(url);
    if (map) {
      const original = resolveOriginalLine(map, genLine, genCol);
      if (original) {
        return {
          name: name || original.file.replace(/.*\//, "").replace(/\.\w+$/, ""),
          file: original.file,
          line: original.line,
          column: original.column,
        };
      }
    }

    // Fallback: use generated line numbers
    return { name, file: filePath, line: genLine, column: genCol };
  }
  return null;
}

async function findComponentFiber(fiber: FiberNode): Promise<ComponentInfo | null> {
  // React 18: walk up to find _debugSource on a component fiber
  let current: FiberNode | null | undefined = fiber;
  while (current) {
    const typeName =
      (typeof current.type === "object" &&
        (current.type?.displayName || current.type?.name)) ||
      current.elementType?.name ||
      null;

    if (current._debugSource && typeName) {
      return {
        name: typeName,
        file: current._debugSource.fileName,
        line: current._debugSource.lineNumber,
        column: current._debugSource.columnNumber,
      };
    }

    current = current.return;
  }

  // React 19+: _debugSource is gone. Use the clicked element's own _debugStack
  // for file/line (where the element is defined), and walk up for the component name.
  const elementSource = fiber._debugStack?.stack
    ? await parseStackSource(fiber._debugStack.stack)
    : null;

  if (!elementSource) return null;

  // Walk up to find the nearest component name
  let componentName = elementSource.name;
  current = fiber.return;
  while (current) {
    const typeName =
      (typeof current.type === "object" &&
        (current.type?.displayName || current.type?.name)) ||
      current.elementType?.name ||
      null;

    if (typeName) {
      componentName = typeName;
      break;
    }
    current = current.return;
  }

  return {
    name: componentName,
    file: elementSource.file,
    line: elementSource.line,
    column: elementSource.column,
  };
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

  async function handleMouseMove(e: MouseEvent): Promise<void> {
    if (!active) return;
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

    const info = await findComponentFiber(fiber);
    if (!info || !active) {
      hideOverlays();
      return;
    }

    const rect = el.getBoundingClientRect();
    const h = ensureHighlight();
    h.style.top = `${rect.top}px`;
    h.style.left = `${rect.left}px`;
    h.style.width = `${rect.width}px`;
    h.style.height = `${rect.height}px`;

    const shortFile = info.file.split("/").slice(-2).join("/");
    const t = ensureTooltip();
    t.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = info.name;
    t.appendChild(strong);
    t.appendChild(
      document.createTextNode(` \u2014 ${shortFile}:${info.line}`)
    );

    const tooltipTop = rect.top - 30;
    t.style.top = `${tooltipTop < 4 ? rect.bottom + 6 : tooltipTop}px`;
    t.style.left = `${Math.min(e.clientX + 12, window.innerWidth - 240)}px`;
  }

  async function handleClick(e: MouseEvent): Promise<void> {
    if (!active) return;

    e.preventDefault();
    e.stopPropagation();

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || !(el instanceof HTMLElement)) return;

    const fiber = getFiberFromElement(el);
    if (!fiber) return;

    const info = await findComponentFiber(fiber);
    if (!info) return;

    onSelect({
      element: el,
      component: info.name,
      file: info.file,
      line: info.line,
      column: info.column,
    });

    hideOverlays();
  }

  function enable(): void {
    if (active) return;
    active = true;
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
  }

  function disable(): void {
    active = false;
    hideOverlays();
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("click", handleClick, true);
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
