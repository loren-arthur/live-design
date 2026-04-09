import type { WsClient } from "./ws-client.js";

export interface ThemePanel {
  panel: HTMLDivElement;
  toggle(): boolean;
  close(): void;
  getChanges(): Map<string, { oldValue: string; newValue: string }>;
  getChangeCount(): number;
  setEnabled(enabled: boolean): void;
}

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

function detectVariables(configVars?: string[]): string[] {
  if (configVars && configVars.length > 0) return configVars;

  const vars: string[] = [];
  const computed = getComputedStyle(document.documentElement);
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (
          rule instanceof CSSStyleRule &&
          (rule.selectorText === ":root" || rule.selectorText === "html")
        ) {
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (prop.startsWith("--")) {
              vars.push(prop);
            }
          }
        }
      }
    } catch {
      // CORS stylesheets — skip
    }
  }

  // Fallback: check computed style for common atlas vars
  if (vars.length === 0) {
    const testVars = [
      "--atlas-ivory",
      "--atlas-ivory-deep",
      "--atlas-ink",
      "--atlas-ink-light",
      "--atlas-federal",
      "--atlas-federal-light",
    ];
    for (const v of testVars) {
      if (computed.getPropertyValue(v).trim()) {
        vars.push(v);
      }
    }
  }

  return vars;
}

export function createThemePanel(
  shadowRoot: ShadowRoot,
  ws: WsClient,
  configVars?: string[]
): ThemePanel {
  const changes = new Map<string, { oldValue: string; newValue: string }>();
  let enabled = true;

  const panel = document.createElement("div");
  panel.className = "ld-panel";
  panel.style.width = "300px";

  const header = document.createElement("div");
  header.className = "ld-panel-header";

  const title = document.createElement("span");
  title.className = "ld-panel-title";
  title.textContent = "Theme Variables";

  const closeBtn = document.createElement("button");
  closeBtn.className = "ld-panel-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", close);

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const varsContainer = document.createElement("div");
  panel.appendChild(varsContainer);

  // Reset button
  const resetBtn = document.createElement("button");
  resetBtn.className = "ld-btn ld-theme-reset";
  resetBtn.textContent = "Reset All";
  resetBtn.addEventListener("click", () => {
    for (const [variable, { oldValue }] of changes) {
      document.documentElement.style.setProperty(variable, oldValue);
    }
    changes.clear();
    ws.send({ type: "theme:reset" });
    buildVarList();
  });
  panel.appendChild(resetBtn);

  shadowRoot.appendChild(panel);

  function buildVarList(): void {
    varsContainer.innerHTML = "";
    const vars = detectVariables(configVars);
    const computed = getComputedStyle(document.documentElement);

    for (const varName of vars) {
      const currentValue = computed.getPropertyValue(varName).trim();
      if (!currentValue) continue;

      const row = document.createElement("div");
      row.className = "ld-theme-var";

      const label = document.createElement("label");
      label.textContent = varName;
      label.title = varName;
      row.appendChild(label);

      // Color swatch for color values
      if (COLOR_RE.test(currentValue)) {
        const swatch = document.createElement("div");
        swatch.className = "ld-color-swatch";
        swatch.style.background = currentValue;
        row.appendChild(swatch);

        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = currentValue.startsWith("rgb")
          ? rgbToHex(currentValue)
          : currentValue.length === 4
            ? `#${currentValue[1]}${currentValue[1]}${currentValue[2]}${currentValue[2]}${currentValue[3]}${currentValue[3]}`
            : currentValue;

        colorInput.addEventListener("input", () => {
          if (!enabled) return;
          const newVal = colorInput.value;
          applyChange(varName, currentValue, newVal);
          swatch.style.background = newVal;
        });
        row.appendChild(colorInput);
      } else if (LENGTH_RE.test(currentValue)) {
        const match = currentValue.match(/^(-?[\d.]+)\s*(px|rem|em|%)$/);
        const numVal = match ? parseFloat(match[1]) : 0;
        const unit = match ? match[2] : "px";

        const range = document.createElement("input");
        range.type = "range";
        range.min = "0";
        range.max = unit === "rem" || unit === "em" ? "10" : "200";
        range.step = unit === "rem" || unit === "em" ? "0.125" : "1";
        range.value = String(numVal);

        const textInput = document.createElement("input");
        textInput.type = "text";
        textInput.value = currentValue;
        textInput.style.width = "60px";

        range.addEventListener("input", () => {
          if (!enabled) return;
          const newVal = `${range.value}${unit}`;
          textInput.value = newVal;
          applyChange(varName, currentValue, newVal);
        });

        textInput.addEventListener("change", () => {
          if (!enabled) return;
          applyChange(varName, currentValue, textInput.value);
        });

        row.appendChild(range);
        row.appendChild(textInput);
      } else {
        const textInput = document.createElement("input");
        textInput.type = "text";
        textInput.value = currentValue;

        textInput.addEventListener("change", () => {
          if (!enabled) return;
          applyChange(varName, currentValue, textInput.value);
        });

        row.appendChild(textInput);
      }

      varsContainer.appendChild(row);
    }

    if (varsContainer.children.length === 0) {
      const empty = document.createElement("div");
      empty.className = "ld-empty";
      empty.textContent = "No CSS variables detected.";
      varsContainer.appendChild(empty);
    }
  }

  function applyChange(
    variable: string,
    oldValue: string,
    newValue: string
  ): void {
    document.documentElement.style.setProperty(variable, newValue);

    const existing = changes.get(variable);
    changes.set(variable, {
      oldValue: existing ? existing.oldValue : oldValue,
      newValue,
    });

    ws.send({ type: "theme:change", variable, value: newValue });
  }

  function toggle(): boolean {
    const open = panel.classList.toggle("open");
    if (open) buildVarList();
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
    getChanges: () => changes,
    getChangeCount: () => changes.size,
    setEnabled,
  };
}
