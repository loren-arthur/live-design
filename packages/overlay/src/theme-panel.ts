import type { WsClient } from "./ws-client.js";

export interface ThemePanel {
  panel: HTMLDivElement;
  toggle(): boolean;
  close(): void;
  getChangeCount(): number;
  setEnabled(enabled: boolean): void;
}

// ── Radix Themes detection & control surface ──

export function findRadixRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-is-root-theme="true"]');
}

const ACCENT_COLORS = [
  "gray", "gold", "bronze", "brown",
  "yellow", "amber", "orange", "tomato",
  "red", "ruby", "crimson", "pink",
  "plum", "purple", "violet", "iris",
  "indigo", "blue", "cyan", "teal",
  "jade", "green", "grass", "lime",
  "mint", "sky",
] as const;

const GRAY_COLORS = ["auto", "gray", "mauve", "slate", "sage", "olive", "sand"] as const;
const RADII = ["none", "small", "medium", "large", "full"] as const;
const SCALINGS = ["90%", "95%", "100%", "105%", "110%"] as const;
const APPEARANCES = ["light", "dark", "inherit"] as const;
const PANEL_BACKGROUNDS = ["solid", "translucent"] as const;

// Approximate accent swatch colors (Radix accent-9 step) for the picker grid
const ACCENT_SWATCHES: Record<string, string> = {
  gray: "#8b8d98", gold: "#978365", bronze: "#a18072", brown: "#ad7f58",
  yellow: "#ffe629", amber: "#ffc53d", orange: "#f76b15", tomato: "#e54d2e",
  red: "#e5484d", ruby: "#e54666", crimson: "#e93d82", pink: "#d6409f",
  plum: "#ab4aba", purple: "#8e4ec6", violet: "#6e56cf", iris: "#5b5bd6",
  indigo: "#3e63dd", blue: "#0090ff", cyan: "#00a2c7", teal: "#12a594",
  jade: "#29a383", green: "#30a46c", grass: "#46a758", lime: "#bdee63",
  mint: "#86ead4", sky: "#7ce2fe",
};

// Approximate gray swatches (Radix gray-9 — they're subtle, but distinct enough at this size)
const GRAY_SWATCHES: Record<string, string> = {
  gray: "#8b8d98",
  mauve: "#8e8c99",
  slate: "#838995",
  sage: "#868e8b",
  olive: "#898e87",
  sand: "#8d8d86",
  // "auto" rendered as a gradient to indicate it adapts
  auto: "linear-gradient(135deg, #8b8d98 0%, #d6409f 100%)",
};

// CSS variables that may be useful as custom controls (color-detect via regex below)
const COLOR_RE = /^#[0-9a-f]{3,8}$|^rgb/i;
const LENGTH_RE = /^-?[\d.]+\s*(px|rem|em|%)$/;

function rgbToHex(rgb: string): string {
  const match = rgb.match(/(\d+)/g);
  if (!match || match.length < 3) return "#000000";
  const hex = match
    .slice(0, 3)
    .map((n) => parseInt(n, 10).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

export function createThemePanel(
  shadowRoot: ShadowRoot,
  ws: WsClient,
  customVars?: string[]
): ThemePanel {
  const root = findRadixRoot();
  const changes = new Map<string, { oldValue: string; newValue: string }>();
  let enabled = true;

  const panel = document.createElement("div");
  panel.className = "ld-panel";
  panel.style.width = "340px";

  const header = document.createElement("div");
  header.className = "ld-panel-header";

  const title = document.createElement("span");
  title.className = "ld-panel-title";
  title.textContent = "Radix Theme";
  header.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.className = "ld-panel-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", close);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "ld-radix-body";
  panel.appendChild(body);

  // Reset
  const resetBtn = document.createElement("button");
  resetBtn.className = "ld-btn ld-theme-reset";
  resetBtn.textContent = "Reset All";
  resetBtn.addEventListener("click", () => {
    if (!root) return;
    for (const [prop, { oldValue }] of changes) {
      if (prop.startsWith("--")) {
        document.documentElement.style.setProperty(prop, oldValue);
      } else {
        applyToRoot(prop, oldValue);
      }
    }
    changes.clear();
    ws.send({ type: "theme:reset" });
    rebuild();
  });
  panel.appendChild(resetBtn);

  shadowRoot.appendChild(panel);

  function readCurrent(prop: string): string {
    if (!root) return "";
    switch (prop) {
      case "accentColor": return root.getAttribute("data-accent-color") ?? "";
      case "grayColor": return root.getAttribute("data-gray-color") ?? "";
      case "radius": return root.getAttribute("data-radius") ?? "";
      case "scaling": return root.getAttribute("data-scaling") ?? "";
      case "appearance": {
        if (root.classList.contains("dark")) return "dark";
        if (root.classList.contains("light")) return "light";
        return "inherit";
      }
      case "panelBackground": return root.getAttribute("data-panel-background") ?? "";
      case "hasBackground": return root.getAttribute("data-has-background") ?? "true";
      default: return "";
    }
  }

  function applyToRoot(prop: string, value: string): void {
    if (!root) return;
    switch (prop) {
      case "accentColor": root.setAttribute("data-accent-color", value); break;
      case "grayColor": root.setAttribute("data-gray-color", value); break;
      case "radius": root.setAttribute("data-radius", value); break;
      case "scaling": root.setAttribute("data-scaling", value); break;
      case "appearance":
        root.classList.remove("light", "dark");
        if (value === "light" || value === "dark") root.classList.add(value);
        break;
      case "panelBackground": root.setAttribute("data-panel-background", value); break;
      case "hasBackground": root.setAttribute("data-has-background", value); break;
    }
  }

  function recordChange(prop: string, newValue: string): void {
    if (!enabled) return;
    if (prop.startsWith("--")) {
      const current = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
      const original = changes.get(prop)?.oldValue ?? current;
      document.documentElement.style.setProperty(prop, newValue);
      changes.set(prop, { oldValue: original, newValue });
    } else {
      if (!root) return;
      const current = readCurrent(prop);
      const original = changes.get(prop)?.oldValue ?? current;
      applyToRoot(prop, newValue);
      changes.set(prop, { oldValue: original, newValue });
    }
    ws.send({ type: "theme:change", variable: prop, value: newValue });
    rebuild();
  }

  function makeSection(label: string): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "ld-radix-section";
    const lbl = document.createElement("div");
    lbl.className = "ld-radix-label";
    lbl.textContent = label;
    wrap.appendChild(lbl);
    return wrap;
  }

  function makeColorGrid(prop: string, swatches: Record<string, string>, options: readonly string[], current: string): HTMLDivElement {
    const grid = document.createElement("div");
    grid.className = "ld-radix-accent-grid";
    for (const color of options) {
      const swatch = document.createElement("button");
      swatch.className = "ld-radix-swatch";
      if (color === current) swatch.classList.add("active");
      swatch.style.background = swatches[color];
      swatch.title = color;
      swatch.addEventListener("click", () => recordChange(prop, color));
      grid.appendChild(swatch);
    }
    return grid;
  }

  function makeSelect(prop: string, options: readonly string[], current: string): HTMLSelectElement {
    const select = document.createElement("select");
    select.className = "ld-radix-select";
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      if (opt === current) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener("change", () => recordChange(prop, select.value));
    return select;
  }

  function makeToggle(prop: string, options: readonly string[], current: string): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "ld-radix-toggle";
    for (const opt of options) {
      const btn = document.createElement("button");
      btn.className = "ld-radix-toggle-btn";
      if (opt === current) btn.classList.add("active");
      btn.textContent = opt;
      btn.addEventListener("click", () => recordChange(prop, opt));
      wrap.appendChild(btn);
    }
    return wrap;
  }

  function makeBoolToggle(prop: string, current: string): HTMLDivElement {
    return makeToggle(prop, ["true", "false"], current);
  }

  function makeCustomVarRow(varName: string): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "ld-radix-section";

    const lbl = document.createElement("div");
    lbl.className = "ld-radix-label";
    lbl.textContent = varName;
    wrap.appendChild(lbl);

    const computed = getComputedStyle(document.documentElement);
    const currentValue = computed.getPropertyValue(varName).trim();

    if (!currentValue) {
      const empty = document.createElement("div");
      empty.style.fontSize = "11px";
      empty.style.color = "#666";
      empty.textContent = "(not defined)";
      wrap.appendChild(empty);
      return wrap;
    }

    if (COLOR_RE.test(currentValue)) {
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.className = "ld-radix-color-input";
      colorInput.value = currentValue.startsWith("rgb")
        ? rgbToHex(currentValue)
        : currentValue.length === 4
          ? `#${currentValue[1]}${currentValue[1]}${currentValue[2]}${currentValue[2]}${currentValue[3]}${currentValue[3]}`
          : currentValue.slice(0, 7);
      colorInput.addEventListener("input", () => recordChange(varName, colorInput.value));
      wrap.appendChild(colorInput);
    } else if (LENGTH_RE.test(currentValue)) {
      const match = currentValue.match(/^(-?[\d.]+)\s*(px|rem|em|%)$/);
      const numVal = match ? parseFloat(match[1]) : 0;
      const unit = match ? match[2] : "px";

      const range = document.createElement("input");
      range.type = "range";
      range.className = "ld-radix-range";
      range.min = "0";
      range.max = unit === "rem" || unit === "em" ? "10" : "200";
      range.step = unit === "rem" || unit === "em" ? "0.125" : "1";
      range.value = String(numVal);
      range.addEventListener("input", () => recordChange(varName, `${range.value}${unit}`));
      wrap.appendChild(range);
    } else {
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.className = "ld-radix-text-input";
      textInput.value = currentValue;
      textInput.addEventListener("change", () => recordChange(varName, textInput.value));
      wrap.appendChild(textInput);
    }

    return wrap;
  }

  function rebuild(): void {
    body.innerHTML = "";

    if (!root) {
      const empty = document.createElement("div");
      empty.className = "ld-empty";
      empty.textContent = "No Radix Themes detected on this page.";
      body.appendChild(empty);
      return;
    }

    // Appearance
    const appearance = makeSection("Appearance");
    appearance.appendChild(makeToggle("appearance", APPEARANCES, readCurrent("appearance")));
    body.appendChild(appearance);

    // Accent color
    const accent = makeSection("Accent Color");
    accent.appendChild(makeColorGrid("accentColor", ACCENT_SWATCHES, ACCENT_COLORS, readCurrent("accentColor")));
    body.appendChild(accent);

    // Gray color (now a swatch grid)
    const gray = makeSection("Gray Color");
    gray.appendChild(makeColorGrid("grayColor", GRAY_SWATCHES, GRAY_COLORS, readCurrent("grayColor")));
    body.appendChild(gray);

    // Radius
    const radius = makeSection("Radius");
    radius.appendChild(makeToggle("radius", RADII, readCurrent("radius")));
    body.appendChild(radius);

    // Scaling
    const scaling = makeSection("Scaling");
    scaling.appendChild(makeToggle("scaling", SCALINGS, readCurrent("scaling")));
    body.appendChild(scaling);

    // Panel background
    const pb = makeSection("Panel Background");
    pb.appendChild(makeToggle("panelBackground", PANEL_BACKGROUNDS, readCurrent("panelBackground")));
    body.appendChild(pb);

    // Has background
    const hb = makeSection("Has Background");
    hb.appendChild(makeBoolToggle("hasBackground", readCurrent("hasBackground")));
    body.appendChild(hb);

    // Custom CSS variables (passed in via config)
    if (customVars && customVars.length > 0) {
      const divider = document.createElement("div");
      divider.className = "ld-radix-divider";
      divider.textContent = "Custom Variables";
      body.appendChild(divider);
      for (const v of customVars) {
        body.appendChild(makeCustomVarRow(v));
      }
    }
  }

  function toggle(): boolean {
    const open = panel.classList.toggle("open");
    if (open) rebuild();
    return open;
  }

  function close(): void {
    panel.classList.remove("open");
  }

  function setEnabled(e: boolean): void {
    enabled = e;
  }

  return {
    panel,
    toggle,
    close,
    getChangeCount: () => changes.size,
    setEnabled,
  };
}
