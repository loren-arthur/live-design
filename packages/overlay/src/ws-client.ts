import type { BrowserMessage, ServerMessage } from "@live-design/shared";

type MessageHandler<T extends ServerMessage["type"]> = (
  msg: Extract<ServerMessage, { type: T }>
) => void;

export class WsClient extends EventTarget {
  private ws: WebSocket | null = null;
  private port: number;
  private backoff = 1000;
  private maxBackoff = 10000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(port: number) {
    super();
    this.port = port;
    this.connect();
  }

  private connect(): void {
    if (this.closed) return;

    try {
      this.ws = new WebSocket(`ws://localhost:${this.port}`);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.backoff = 1000;
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as ServerMessage;
        this.dispatchEvent(new CustomEvent(msg.type, { detail: msg }));
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, this.maxBackoff);
  }

  send(msg: BrowserMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  on<T extends ServerMessage["type"]>(
    type: T,
    handler: MessageHandler<T>
  ): void {
    this.addEventListener(type, ((e: Event) => {
      handler((e as CustomEvent).detail);
    }) as EventListener);
  }

  destroy(): void {
    this.closed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
