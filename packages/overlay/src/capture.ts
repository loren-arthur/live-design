// Capture utilities for DOM snapshots and screenshots.
// Screenshots use html2canvas loaded dynamically from a CDN to avoid
// bundling a large dependency into the overlay.

const HTML2CANVAS_URL = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm";

interface Html2Canvas {
  (element: HTMLElement, options?: Record<string, unknown>): Promise<HTMLCanvasElement>;
}

let html2canvasPromise: Promise<Html2Canvas> | null = null;

async function loadHtml2Canvas(): Promise<Html2Canvas> {
  if (!html2canvasPromise) {
    html2canvasPromise = (async () => {
      const mod = await import(/* @vite-ignore */ HTML2CANVAS_URL);
      return (mod.default ?? mod) as Html2Canvas;
    })();
  }
  return html2canvasPromise;
}

export interface DomSnapshot {
  html: string;
  url: string;
  viewport: { width: number; height: number };
}

export function captureDom(overlayHostId: string): DomSnapshot {
  // Clone the document so we can strip the overlay without mutating the page
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  const overlayHost = clone.querySelector(`#${overlayHostId}`);
  if (overlayHost) overlayHost.remove();

  return {
    html: clone.outerHTML,
    url: window.location.href,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

export async function captureScreenshot(overlayHostId: string): Promise<string> {
  const html2canvas = await loadHtml2Canvas();

  const host = document.getElementById(overlayHostId);
  const prevDisplay = host?.style.display;
  if (host) host.style.display = "none";

  try {
    const canvas = await html2canvas(document.body, {
      backgroundColor: null,
      logging: false,
      useCORS: true,
      scale: window.devicePixelRatio || 1,
    });
    return canvas.toDataURL("image/png");
  } finally {
    if (host) host.style.display = prevDisplay ?? "";
  }
}
