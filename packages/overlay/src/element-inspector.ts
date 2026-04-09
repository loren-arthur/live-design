import type { ElementChange, StyleChange } from "@live-design/shared";
import type { WsClient } from "./ws-client.js";
import type { SelectedComponent } from "./component-selector.js";
import type { createStylesheetIndex } from "./stylesheet-index.js";

// ── Constants ──

const STYLE_PROPERTIES: { section: string; props: string[] }[] = [
  {
    section: "Layout",
    props: ["display", "padding", "margin", "gap", "width", "height"],
  },
  {
    section: "Typography",
    props: ["font-size", "font-weight", "line-height", "color", "text-align"],
  },
  {
    section: "Background",
    props: ["background-color", "background"],
  },
  {
    section: "Border",
    props: ["border", "border-radius", "box-shadow"],
  },
  {
    section: "Spacing",
    props: ["opacity"],
  },
];

const COLOR_RE = /^#[0-9a-f]{3,8}$|^rgb/i;
const SIZE_RE = /^-?[\d.]+\s*(px|rem|em)$/;

function rgbToHex(rgb: string): string {
  const match = rgb.match(/(\d+)/g);
  if (!match || match.length < 3) return "#000000";
  const hex = match
    .slice(0, 3)
    .map((n) => parseInt(n, 10).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

function parseSize(value: string): { num: number; unit: string } | null {
  const m = value.match(/^(-?[\d.]+)\s*(px|rem|em)$/);
  if (!m) return null;
  return { num: parseFloat(m[1]), unit: m[2] };
}

// ── Inspector factory ──

export function createElementInspector(
  shadowRoot: ShadowRoot,
  ws: WsClient,
  stylesheetIndex: ReturnType<typeof createStylesheetIndex>
): {
  inspect(component: SelectedComponent): void;
  close(): void;
  toggle(): boolean;
  getChanges(): ElementChange[];
  setEnabled(enabled: boolean): void;
  reset(): void;
} {
  let enabled = true;
  let currentComponent: SelectedComponent | null = null;
  const allChanges: ElementChange[] = [];
  let currentChange: ElementChange | null = null;

  // Maps for reverting: element -> original inline styles / class mutations
  const appliedInlineStyles = new Map<
    HTMLElement,
    Map<string, string | null>
  >();
  const appliedClassChanges = new Map<
    HTMLElement,
    { added: Set<string>; removed: Set<string> }
  >();

  // ── Panel DOM ──

  const panel = document.createElement("div");
  panel.className = "inspector-panel";

  const header = document.createElement("div");
  header.className = "inspector-header";

  const headerName = document.createElement("div");
  headerName.className = "inspector-header-name";

  const headerLoc = document.createElement("div");
  headerLoc.className = "inspector-header-loc";

  const closeBtn = document.createElement("button");
  closeBtn.className = "ld-panel-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", close);

  const headerLeft = document.createElement("div");
  headerLeft.appendChild(headerName);
  headerLeft.appendChild(headerLoc);

  header.appendChild(headerLeft);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "inspector-body";
  panel.appendChild(body);

  shadowRoot.appendChild(panel);

  // ── Helpers ──

  function ensureClassTracking(el: HTMLElement) {
    if (!appliedClassChanges.has(el)) {
      appliedClassChanges.set(el, { added: new Set(), removed: new Set() });
    }
    return appliedClassChanges.get(el)!;
  }

  function ensureInlineTracking(el: HTMLElement) {
    if (!appliedInlineStyles.has(el)) {
      appliedInlineStyles.set(el, new Map());
    }
    return appliedInlineStyles.get(el)!;
  }

  function ensureCurrentChange(component: SelectedComponent): ElementChange {
    if (!currentChange) {
      const shortFile = component.file.split("/").slice(-2).join("/");
      currentChange = {
        id: `ec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        location: {
          component: component.component,
          file: component.file,
          line: component.line,
          column: component.column,
        },
        classesAdded: [],
        classesRemoved: [],
        styleChanges: [],
        timestamp: Date.now(),
      };
      allChanges.push(currentChange);
    }
    return currentChange;
  }

  function sendElementChange(): void {
    if (!currentChange || !currentComponent) return;
    ws.send({
      type: "element:change",
      change: {
        location: currentChange.location,
        classesAdded: currentChange.classesAdded,
        classesRemoved: currentChange.classesRemoved,
        styleChanges: currentChange.styleChanges,
      },
    });
  }

  // ── Classes section ──

  function buildClassesSection(
    container: HTMLElement,
    component: SelectedComponent
  ): void {
    const section = document.createElement("div");
    section.className = "inspector-section";

    const titleRow = document.createElement("div");
    titleRow.className = "inspector-section-title";
    let classesOpen = true;

    const arrow = document.createElement("span");
    arrow.className = "inspector-arrow";
    arrow.textContent = "\u25BE";

    const titleText = document.createElement("span");
    titleText.textContent = "Classes";

    titleRow.appendChild(arrow);
    titleRow.appendChild(titleText);

    const sectionBody = document.createElement("div");
    sectionBody.className = "inspector-section-body";

    titleRow.addEventListener("click", () => {
      classesOpen = !classesOpen;
      sectionBody.style.display = classesOpen ? "" : "none";
      arrow.textContent = classesOpen ? "\u25BE" : "\u25B8";
    });

    section.appendChild(titleRow);
    section.appendChild(sectionBody);

    function renderClassTags(): void {
      sectionBody.innerHTML = "";
      const tagsWrap = document.createElement("div");
      tagsWrap.className = "class-tags";

      const classes = Array.from(component.element.classList);
      for (const cls of classes) {
        const tag = document.createElement("span");
        tag.className = "class-tag";

        const tagName = document.createElement("span");
        tagName.textContent = cls;
        tag.appendChild(tagName);

        if (enabled) {
          const removeBtn = document.createElement("button");
          removeBtn.className = "class-tag-remove";
          removeBtn.textContent = "\u00d7";
          removeBtn.addEventListener("click", () => {
            component.element.classList.remove(cls);
            const tracking = ensureClassTracking(component.element);
            if (tracking.added.has(cls)) {
              tracking.added.delete(cls);
            } else {
              tracking.removed.add(cls);
            }
            const change = ensureCurrentChange(component);
            if (change.classesAdded.includes(cls)) {
              change.classesAdded = change.classesAdded.filter(
                (c) => c !== cls
              );
            } else if (!change.classesRemoved.includes(cls)) {
              change.classesRemoved.push(cls);
            }
            sendElementChange();
            renderClassTags();
          });
          tag.appendChild(removeBtn);
        }

        tagsWrap.appendChild(tag);
      }

      sectionBody.appendChild(tagsWrap);

      // Add class button + dropdown
      if (enabled) {
        const addWrap = document.createElement("div");
        addWrap.className = "class-add";

        const addBtn = document.createElement("button");
        addBtn.className = "ld-btn class-add-btn";
        addBtn.textContent = "+";

        const searchWrap = document.createElement("div");
        searchWrap.className = "class-search-wrap";
        searchWrap.style.display = "none";

        const searchInput = document.createElement("input");
        searchInput.className = "class-search";
        searchInput.type = "text";
        searchInput.placeholder = "Search classes...";

        const dropdown = document.createElement("div");
        dropdown.className = "class-dropdown";

        searchWrap.appendChild(searchInput);
        searchWrap.appendChild(dropdown);

        addBtn.addEventListener("click", () => {
          const showing = searchWrap.style.display !== "none";
          searchWrap.style.display = showing ? "none" : "";
          if (!showing) {
            requestAnimationFrame(() => searchInput.focus());
            renderDropdown("");
          }
        });

        function renderDropdown(query: string): void {
          dropdown.innerHTML = "";
          const results = stylesheetIndex.search(query);
          const currentClasses = new Set(component.element.classList);

          let count = 0;
          for (const cls of results) {
            if (currentClasses.has(cls.name)) continue;
            if (count >= 50) break;
            count++;

            const item = document.createElement("div");
            item.className = "class-dropdown-item";

            const itemName = document.createElement("span");
            itemName.className = "class-dropdown-name";
            itemName.textContent = cls.name;
            item.appendChild(itemName);

            if (cls.properties.length > 0) {
              const itemProps = document.createElement("span");
              itemProps.className = "class-dropdown-props";
              itemProps.textContent = cls.properties.slice(0, 2).join("; ");
              item.appendChild(itemProps);
            }

            item.addEventListener("click", () => {
              component.element.classList.add(cls.name);
              const tracking = ensureClassTracking(component.element);
              if (tracking.removed.has(cls.name)) {
                tracking.removed.delete(cls.name);
              } else {
                tracking.added.add(cls.name);
              }
              const change = ensureCurrentChange(component);
              if (change.classesRemoved.includes(cls.name)) {
                change.classesRemoved = change.classesRemoved.filter(
                  (c) => c !== cls.name
                );
              } else if (!change.classesAdded.includes(cls.name)) {
                change.classesAdded.push(cls.name);
              }
              sendElementChange();
              searchWrap.style.display = "none";
              searchInput.value = "";
              renderClassTags();
            });

            dropdown.appendChild(item);
          }

          if (count === 0) {
            const empty = document.createElement("div");
            empty.className = "class-dropdown-item class-dropdown-empty";
            empty.textContent = query ? "No matching classes" : "No classes indexed";
            dropdown.appendChild(empty);
          }
        }

        searchInput.addEventListener("input", () => {
          renderDropdown(searchInput.value);
        });

        addWrap.appendChild(addBtn);
        addWrap.appendChild(searchWrap);
        sectionBody.appendChild(addWrap);
      }
    }

    renderClassTags();
    container.appendChild(section);
  }

  // ── Styles section ──

  function buildStylesSection(
    container: HTMLElement,
    component: SelectedComponent
  ): void {
    const section = document.createElement("div");
    section.className = "inspector-section";

    const titleRow = document.createElement("div");
    titleRow.className = "inspector-section-title";
    let stylesOpen = true;

    const arrow = document.createElement("span");
    arrow.className = "inspector-arrow";
    arrow.textContent = "\u25BE";

    const titleText = document.createElement("span");
    titleText.textContent = "Styles";

    titleRow.appendChild(arrow);
    titleRow.appendChild(titleText);

    const sectionBody = document.createElement("div");
    sectionBody.className = "inspector-section-body";

    titleRow.addEventListener("click", () => {
      stylesOpen = !stylesOpen;
      sectionBody.style.display = stylesOpen ? "" : "none";
      arrow.textContent = stylesOpen ? "\u25BE" : "\u25B8";
    });

    section.appendChild(titleRow);
    section.appendChild(sectionBody);

    const computed = getComputedStyle(component.element);
    const inlineTracking = ensureInlineTracking(component.element);

    for (const group of STYLE_PROPERTIES) {
      for (const prop of group.props) {
        const computedValue = computed.getPropertyValue(prop).trim();
        if (!computedValue) continue;

        const row = document.createElement("div");
        row.className = "style-row";

        const label = document.createElement("div");
        label.className = "style-label";
        label.textContent = prop;
        label.title = prop;
        row.appendChild(label);

        const valueWrap = document.createElement("div");
        valueWrap.className = "style-value";

        if (COLOR_RE.test(computedValue)) {
          // Color: swatch + color picker + text
          const swatch = document.createElement("div");
          swatch.className = "style-color-swatch";
          swatch.style.background = computedValue;
          valueWrap.appendChild(swatch);

          const colorInput = document.createElement("input");
          colorInput.type = "color";
          colorInput.className = "style-color-input";
          colorInput.value = computedValue.startsWith("rgb")
            ? rgbToHex(computedValue)
            : computedValue.length === 4
              ? `#${computedValue[1]}${computedValue[1]}${computedValue[2]}${computedValue[2]}${computedValue[3]}${computedValue[3]}`
              : computedValue;
          colorInput.disabled = !enabled;

          colorInput.addEventListener("input", () => {
            applyStyleChange(
              component,
              prop,
              computedValue,
              colorInput.value
            );
            swatch.style.background = colorInput.value;
          });

          valueWrap.appendChild(colorInput);
        } else if (SIZE_RE.test(computedValue)) {
          // Size: slider + text input
          const parsed = parseSize(computedValue)!;
          const maxVal =
            parsed.unit === "rem" || parsed.unit === "em"
              ? 10
              : Math.max(parsed.num * 2, 100);
          const step =
            parsed.unit === "rem" || parsed.unit === "em" ? 0.125 : 1;

          const slider = document.createElement("input");
          slider.type = "range";
          slider.className = "style-slider";
          slider.min = "0";
          slider.max = String(maxVal);
          slider.step = String(step);
          slider.value = String(parsed.num);
          slider.disabled = !enabled;

          const textInput = document.createElement("input");
          textInput.type = "text";
          textInput.className = "style-text-input";
          textInput.value = computedValue;
          textInput.disabled = !enabled;

          slider.addEventListener("input", () => {
            const newVal = `${slider.value}${parsed.unit}`;
            textInput.value = newVal;
            applyStyleChange(component, prop, computedValue, newVal);
          });

          textInput.addEventListener("change", () => {
            applyStyleChange(
              component,
              prop,
              computedValue,
              textInput.value
            );
            // Sync slider if the new value is parseable
            const p = parseSize(textInput.value);
            if (p) slider.value = String(p.num);
          });

          valueWrap.appendChild(slider);
          valueWrap.appendChild(textInput);
        } else {
          // Generic text input
          const textInput = document.createElement("input");
          textInput.type = "text";
          textInput.className = "style-text-input";
          textInput.value = computedValue;
          textInput.disabled = !enabled;

          textInput.addEventListener("change", () => {
            applyStyleChange(
              component,
              prop,
              computedValue,
              textInput.value
            );
          });

          valueWrap.appendChild(textInput);
        }

        row.appendChild(valueWrap);
        sectionBody.appendChild(row);
      }
    }

    container.appendChild(section);
  }

  function applyStyleChange(
    component: SelectedComponent,
    prop: string,
    oldValue: string,
    newValue: string
  ): void {
    component.element.style.setProperty(prop, newValue);

    // Track original value for revert
    const inlineTracking = ensureInlineTracking(component.element);
    if (!inlineTracking.has(prop)) {
      // Store the original inline value (null if none was set)
      inlineTracking.set(
        prop,
        component.element.style.getPropertyValue(prop) === newValue
          ? oldValue
          : component.element.style.getPropertyValue(prop) || null
      );
    }

    const change = ensureCurrentChange(component);

    // Update or add style change entry
    const existing = change.styleChanges.find((s) => s.property === prop);
    if (existing) {
      existing.newValue = newValue;
    } else {
      change.styleChanges.push({ property: prop, oldValue, newValue });
    }

    sendElementChange();
  }

  // ── Public API ──

  function inspect(component: SelectedComponent): void {
    // Finalize previous component's change tracking
    if (
      currentComponent &&
      currentComponent.element !== component.element
    ) {
      currentChange = null;
    }

    currentComponent = component;

    // Update header
    headerName.textContent = component.component;
    const shortFile = component.file.split("/").slice(-2).join("/");
    headerLoc.textContent = `${shortFile}:${component.line}`;

    // Rebuild body
    body.innerHTML = "";
    buildClassesSection(body, component);
    buildStylesSection(body, component);

    // Show panel
    panel.classList.add("open");
  }

  function close(): void {
    panel.classList.remove("open");
    currentComponent = null;
    currentChange = null;
  }

  function getChanges(): ElementChange[] {
    return allChanges.slice();
  }

  function setEnabled(e: boolean): void {
    enabled = e;
    // Re-render if currently showing a component to toggle input states
    if (currentComponent && panel.classList.contains("open")) {
      inspect(currentComponent);
    }
  }

  function reset(): void {
    // Revert all inline style changes
    for (const [el, originals] of appliedInlineStyles) {
      for (const [prop, original] of originals) {
        if (original === null) {
          el.style.removeProperty(prop);
        } else {
          el.style.setProperty(prop, original);
        }
      }
    }
    appliedInlineStyles.clear();

    // Revert all class changes
    for (const [el, tracking] of appliedClassChanges) {
      for (const cls of tracking.added) {
        el.classList.remove(cls);
      }
      for (const cls of tracking.removed) {
        el.classList.add(cls);
      }
    }
    appliedClassChanges.clear();

    // Clear change records
    allChanges.length = 0;
    currentChange = null;

    // Re-render if open
    if (currentComponent && panel.classList.contains("open")) {
      inspect(currentComponent);
    }
  }

  function toggle(): boolean {
    const isOpen = panel.classList.toggle("open");
    if (!isOpen) {
      currentComponent = null;
      currentChange = null;
    }
    return isOpen;
  }

  return { inspect, close, toggle, getChanges, setEnabled, reset };
}
