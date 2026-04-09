export interface FreezeController {
  freeze(): void;
  unfreeze(message?: string): void;
  destroy(): void;
}

export function createFreezeController(
  shadowRoot: ShadowRoot,
  onStateChange: (frozen: boolean) => void
): FreezeController {
  let banner: HTMLDivElement | null = null;
  let toast: HTMLDivElement | null = null;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function freeze(): void {
    onStateChange(true);

    if (!banner) {
      banner = document.createElement("div");
      banner.className = "ld-freeze-banner";
      banner.textContent = "Agent is working on your feedback...";
      shadowRoot.appendChild(banner);
    }
  }

  function unfreeze(message?: string): void {
    onStateChange(false);

    if (banner) {
      banner.remove();
      banner = null;
    }

    if (message) {
      showToast(message);
    }
  }

  function showToast(message: string): void {
    dismissToast();

    toast = document.createElement("div");
    toast.className = "ld-toast";
    toast.textContent = message;
    shadowRoot.appendChild(toast);

    toastTimer = setTimeout(() => {
      if (toast) {
        toast.classList.add("dismissing");
        setTimeout(() => {
          if (toast) {
            toast.remove();
            toast = null;
          }
        }, 300);
      }
      toastTimer = null;
    }, 8000);
  }

  function dismissToast(): void {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    if (toast) {
      toast.remove();
      toast = null;
    }
  }

  function destroy(): void {
    dismissToast();
    if (banner) {
      banner.remove();
      banner = null;
    }
  }

  return { freeze, unfreeze, destroy };
}
