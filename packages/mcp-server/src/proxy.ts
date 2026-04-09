import * as http from "node:http";
import * as net from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_PORT } from "@live-design/shared";

const DEFAULT_PROXY_PORT = 24680;
const URL_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/;

export interface ProxyOptions {
  target: string;
  port?: number;
  wsPort?: number;
  overlayDir: string;
  author?: string;
  themeVariables?: string[];
}

export interface ProxyHandle {
  url: string;
  close: () => void;
}

const INJECT_SCRIPT = `<script type="module">
(function() {
  import('/@live-design/overlay.js');
})();
</script>`;

function parseTarget(target: string): { hostname: string; port: number } {
  const url = new URL(target);
  return {
    hostname: url.hostname,
    port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
  };
}

function serveLiveDesignFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  overlayDir: string,
  wsPort: number,
  author: string,
  themeVariables: string[],
): boolean {
  const url = req.url ?? "";
  if (!url.startsWith("/@live-design/")) return false;

  const filename = url.slice("/@live-design/".length);

  // Virtual config module
  if (filename === "config.js") {
    const configModule = `export default ${JSON.stringify({ port: wsPort, author, themeVariables })};`;
    res.writeHead(200, {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    });
    res.end(configModule);
    return true;
  }

  // Serve overlay dist files
  if (filename.endsWith(".js")) {
    try {
      let content = readFileSync(join(overlayDir, filename), "utf-8");
      // Rewrite relative imports to absolute /@live-design/ paths
      content = content.replace(
        /from\s+["']\.\/([^"']+)["']/g,
        'from "/@live-design/$1"',
      );
      // Inline the shared constants instead of importing them
      content = content.replace(
        /import\s*\{[^}]*\}\s*from\s*["']@live-design\/shared["'];?\n?/g,
        `const DEFAULT_PORT = ${DEFAULT_PORT};\n`,
      );
      res.writeHead(200, {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache",
      });
      res.end(content);
    } catch {
      res.writeHead(404, { "Content-Type": "application/javascript" });
      res.end(`// [live-design] file not found: ${filename}`);
    }
    return true;
  }

  return false;
}

function proxyRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  targetHost: string,
  targetPort: number,
): void {
  const proxyReqHeaders: http.OutgoingHttpHeaders = { ...req.headers };

  // Ask for uncompressed responses so we can inject into HTML without
  // dealing with gzip/deflate decompression on localhost.
  proxyReqHeaders["accept-encoding"] = "identity";

  // Rewrite host header to target
  proxyReqHeaders["host"] = `${targetHost}:${targetPort}`;

  const proxyReq = http.request(
    {
      hostname: targetHost,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: proxyReqHeaders,
    },
    (proxyRes) => {
      const contentType = proxyRes.headers["content-type"] ?? "";
      const isHtml = contentType.includes("text/html");

      if (!isHtml) {
        // Non-HTML: stream through directly
        res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
        return;
      }

      // HTML response: buffer, inject script, send
      const chunks: Buffer[] = [];
      proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk));
      proxyRes.on("end", () => {
        let body = Buffer.concat(chunks).toString("utf-8");

        // Inject the overlay bootstrap script before </body> or at end
        if (body.includes("</body>")) {
          body = body.replace("</body>", `${INJECT_SCRIPT}\n</body>`);
        } else if (body.includes("</html>")) {
          body = body.replace("</html>", `${INJECT_SCRIPT}\n</html>`);
        } else {
          body += `\n${INJECT_SCRIPT}`;
        }

        // Copy headers but strip content-length and transfer-encoding
        // since we modified the body
        const headers: http.OutgoingHttpHeaders = { ...proxyRes.headers };
        delete headers["content-length"];
        delete headers["transfer-encoding"];
        // Set the correct content-length for the modified body
        const buf = Buffer.from(body, "utf-8");
        headers["content-length"] = buf.length;

        res.writeHead(proxyRes.statusCode ?? 200, headers);
        res.end(buf);
      });
    },
  );

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(`live-design proxy error: ${err.message}`);
  });

  req.pipe(proxyReq, { end: true });
}

function handleUpgrade(
  req: http.IncomingMessage,
  clientSocket: net.Socket,
  head: Buffer,
  targetHost: string,
  targetPort: number,
): void {
  // Create a raw TCP connection to the target for WebSocket passthrough
  const targetSocket = net.connect(targetPort, targetHost, () => {
    // Reconstruct the HTTP upgrade request to forward to the target
    const reqLine = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    const headers = Object.entries(req.headers)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\r\n");

    targetSocket.write(reqLine + headers + "\r\n\r\n");
    if (head.length > 0) {
      targetSocket.write(head);
    }

    // Pipe data in both directions
    targetSocket.pipe(clientSocket);
    clientSocket.pipe(targetSocket);
  });

  targetSocket.on("error", () => {
    clientSocket.destroy();
  });

  clientSocket.on("error", () => {
    targetSocket.destroy();
  });
}

export function spawnDevServer(
  command: string,
  cwd?: string,
  timeoutMs = 30000,
): Promise<{ url: string; process: ChildProcess }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill();
        reject(new Error(`Dev server did not start within ${timeoutMs / 1000}s`));
      }
    }, timeoutMs);

    function checkOutput(data: Buffer): void {
      if (resolved) return;
      const text = data.toString();
      const match = text.match(URL_PATTERN);
      if (match) {
        resolved = true;
        clearTimeout(timer);
        // Normalize 0.0.0.0 to localhost for the proxy
        const url = match[0].replace("0.0.0.0", "localhost");
        resolve({ url, process: child });
      }
    }

    child.stdout?.on("data", checkOutput);
    child.stderr?.on("data", checkOutput);

    child.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(new Error(`Failed to start dev server: ${err.message}`));
      }
    });

    child.on("exit", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(new Error(`Dev server exited with code ${code} before becoming ready`));
      }
    });
  });
}

export function startProxy(options: ProxyOptions): ProxyHandle {
  const port = options.port ?? DEFAULT_PROXY_PORT;
  const wsPort = options.wsPort ?? DEFAULT_PORT;
  const author = options.author ?? "Designer";
  const themeVariables = options.themeVariables ?? [];
  const { hostname: targetHost, port: targetPort } = parseTarget(
    options.target,
  );

  const server = http.createServer((req, res) => {
    // Serve /@live-design/* files directly
    if (
      serveLiveDesignFile(req, res, options.overlayDir, wsPort, author, themeVariables)
    ) {
      return;
    }

    // Proxy everything else to the target dev server
    proxyRequest(req, res, targetHost, targetPort);
  });

  // WebSocket upgrade passthrough so Vite HMR / Next.js hot reload still work
  server.on("upgrade", (req, socket, head) => {
    handleUpgrade(
      req,
      socket as net.Socket,
      head,
      targetHost,
      targetPort,
    );
  });

  server.listen(port);

  const url = `http://localhost:${port}`;

  return {
    url,
    close: () => {
      server.close();
    },
  };
}
