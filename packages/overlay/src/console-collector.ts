import type { ConsoleEntry } from "@live-design/shared";

const entries: ConsoleEntry[] = [];
const MAX_ENTRIES = 200;

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === "object") {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(" ");
}

const originalError = console.error;
const originalWarn = console.warn;

export function initConsoleCollector(): void {
  console.error = (...args: unknown[]) => {
    originalError.apply(console, args);
    if (entries.length < MAX_ENTRIES) {
      entries.push({
        level: "error",
        message: formatArgs(args),
        timestamp: Date.now(),
      });
    }
  };

  console.warn = (...args: unknown[]) => {
    originalWarn.apply(console, args);
    if (entries.length < MAX_ENTRIES) {
      entries.push({
        level: "warn",
        message: formatArgs(args),
        timestamp: Date.now(),
      });
    }
  };
}

/** Return collected entries and clear the buffer. */
export function drainConsoleLogs(): ConsoleEntry[] {
  return entries.splice(0);
}
