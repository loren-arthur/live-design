export interface IndexedClass {
  name: string;
  selector: string;
  properties: string[];
  source: string;
}

export function createStylesheetIndex(): {
  search(query: string): IndexedClass[];
  refresh(): void;
  count(): number;
} {
  let index = new Map<string, IndexedClass>();

  function buildIndex(): void {
    const next = new Map<string, IndexedClass>();

    for (const sheet of document.styleSheets) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        // SecurityError for cross-origin stylesheets — skip
        continue;
      }

      const source = sheet.href ?? "inline";

      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (!(rule instanceof CSSStyleRule)) continue;

        const selector = rule.selectorText;
        if (!selector.startsWith(".")) continue;

        // Extract the class name: strip leading dot, take up to first
        // non-class character (space, comma, colon that starts a pseudo,
        // bracket, etc.). For Tailwind-style selectors like
        // .hover\:bg-blue-500:hover the selectorText includes the
        // escaped colon — we want the full class token.
        const match = selector.match(
          /^\.([a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*)/
        );
        if (!match) continue;

        // Unescape backslash-escaped characters (e.g., hover\:bg-blue-500 → hover:bg-blue-500)
        const className = match[1].replace(/\\(.)/g, "$1");

        // Collect declared properties
        const properties: string[] = [];
        for (let p = 0; p < rule.style.length; p++) {
          const prop = rule.style[p];
          const val = rule.style.getPropertyValue(prop).trim();
          properties.push(`${prop}: ${val}`);
        }

        const existing = next.get(className);
        if (existing) {
          // Merge: deduplicate by property name, later wins
          const seen = new Map<string, string>();
          for (const entry of existing.properties) {
            const colonIdx = entry.indexOf(":");
            if (colonIdx !== -1) {
              seen.set(entry.slice(0, colonIdx).trim(), entry);
            }
          }
          for (const entry of properties) {
            const colonIdx = entry.indexOf(":");
            if (colonIdx !== -1) {
              seen.set(entry.slice(0, colonIdx).trim(), entry);
            }
          }
          existing.properties = Array.from(seen.values());
        } else {
          next.set(className, {
            name: className,
            selector: `.${className}`,
            properties,
            source,
          });
        }
      }
    }

    index = next;
  }

  // Build on creation
  buildIndex();

  function search(query: string): IndexedClass[] {
    if (!query) {
      // Return all, capped at 100
      const all = Array.from(index.values());
      all.sort((a, b) => a.name.localeCompare(b.name));
      return all.slice(0, 100);
    }

    const q = query.toLowerCase();
    const matches: IndexedClass[] = [];

    for (const cls of index.values()) {
      if (cls.name.toLowerCase().includes(q)) {
        matches.push(cls);
      }
    }

    // Sort: exact prefix matches first, then alphabetical
    matches.sort((a, b) => {
      const aPrefix = a.name.toLowerCase().startsWith(q);
      const bPrefix = b.name.toLowerCase().startsWith(q);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;
      return a.name.localeCompare(b.name);
    });

    return matches.slice(0, 100);
  }

  return {
    search,
    refresh: buildIndex,
    count: () => index.size,
  };
}
