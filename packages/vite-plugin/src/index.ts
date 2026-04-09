import type { Plugin } from "vite";
import type { LiveDesignConfig } from "@live-design/shared";
import { DEFAULT_PORT } from "@live-design/shared";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";

export type { LiveDesignConfig };

function resolveOverlayDir(): string {
  // Locate the overlay package's dist directory
  const require = createRequire(import.meta.url);
  const overlayMain = require.resolve("@live-design/overlay");
  return dirname(overlayMain);
}

export function liveDesign(config?: LiveDesignConfig): Plugin {
  const port = config?.port ?? DEFAULT_PORT;
  const author = config?.author ?? "Designer";
  const themeVariables = config?.themeVariables ?? [];

  let overlayDir: string;
  let base: string;

  return {
    name: "live-design",
    apply: "serve",

    configResolved(resolvedConfig) {
      overlayDir = resolveOverlayDir();
      base = resolvedConfig.base ?? "/";
    },

    transformIndexHtml: {
      order: "post",
      handler(html) {
        const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
        const bootstrap = `
(function() {
  import('${prefix}/@live-design/overlay.js');
})();`;

        // Inject after @react-refresh preamble if present, otherwise append before </body>
        const reactRefreshEnd = html.indexOf("</script>", html.indexOf("@react-refresh"));
        if (html.includes("@react-refresh") && reactRefreshEnd !== -1) {
          const insertPos = reactRefreshEnd + "</script>".length;
          return (
            html.slice(0, insertPos) +
            `\n<script type="module">${bootstrap}</script>\n` +
            html.slice(insertPos)
          );
        }

        return html.replace(
          "</body>",
          `<script type="module">${bootstrap}</script>\n</body>`
        );
      },
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Match /@live-design/* with or without base prefix
        const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
        let url = req.url ?? "";
        if (url.startsWith(`${prefix}/@live-design/`)) {
          url = url.slice(prefix.length);
        }
        if (!url.startsWith("/@live-design/")) return next();

        const filename = url.slice("/@live-design/".length);

        // Virtual config module
        if (filename === "config.js") {
          const configModule = `export default ${JSON.stringify({ port, author, themeVariables })};`;
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cache-Control", "no-cache");
          res.end(configModule);
          return;
        }

        // Serve overlay dist files, rewriting bare @live-design/shared imports
        if (filename.endsWith(".js")) {
          try {
            let content = readFileSync(join(overlayDir, filename), "utf-8");
            // Rewrite relative imports to absolute /@live-design/ paths (with base prefix)
            content = content.replace(
              /from\s+["']\.\/([^"']+)["']/g,
              `from "${prefix}/@live-design/$1"`
            );
            // Remove @live-design/shared imports (types are already stripped by tsc)
            content = content.replace(
              /import\s*\{[^}]*\}\s*from\s*["']@live-design\/shared["'];?\n?/g,
              ""
            );
            // Append shared constants after all imports
            const lastImportIdx = content.lastIndexOf("\nimport ");
            if (lastImportIdx !== -1) {
              const lineEnd = content.indexOf("\n", lastImportIdx + 1);
              content = content.slice(0, lineEnd + 1) + `const DEFAULT_PORT = ${DEFAULT_PORT};\n` + content.slice(lineEnd + 1);
            } else {
              content = `const DEFAULT_PORT = ${DEFAULT_PORT};\n` + content;
            }
            res.setHeader("Content-Type", "application/javascript");
            res.setHeader("Cache-Control", "no-cache");
            res.end(content);
          } catch {
            res.statusCode = 404;
            res.end(`// [live-design] file not found: ${filename}`);
          }
          return;
        }

        next();
      });
    },
  };
}

export default liveDesign;
