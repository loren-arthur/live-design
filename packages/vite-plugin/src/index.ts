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

  return {
    name: "live-design",
    apply: "serve",

    configResolved() {
      overlayDir = resolveOverlayDir();
    },

    transformIndexHtml: {
      order: "post",
      handler(html) {
        const bootstrap = `
(function() {
  import('/@live-design/overlay.js');
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
        if (!req.url?.startsWith("/@live-design/")) return next();

        const filename = req.url.slice("/@live-design/".length);

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
            // Rewrite relative imports to absolute /@live-design/ paths
            content = content.replace(
              /from\s+["']\.\/([^"']+)["']/g,
              'from "/@live-design/$1"'
            );
            // Inline the shared constants instead of importing them
            content = content.replace(
              /import\s*\{[^}]*\}\s*from\s*["']@live-design\/shared["'];?\n?/g,
              `const DEFAULT_PORT = ${DEFAULT_PORT};\n`
            );
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
