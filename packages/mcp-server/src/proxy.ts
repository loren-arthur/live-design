import { spawn, type ChildProcess } from "node:child_process";

const URL_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/;

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
