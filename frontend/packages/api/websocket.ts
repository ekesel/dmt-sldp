// frontend/packages/api/websocket.ts

/* eslint-disable no-console */

export type TelemetryEventType = string;

export interface TelemetryMessage<T = unknown> {
  eventType: TelemetryEventType;
  payload: T;
  timestamp?: string;
  id?: string;
}

export interface SocketAuthPayload {
  type: "auth";
  token: string;
}

export interface SocketSubscribePayload {
  type: "subscribe";
  events: TelemetryEventType[];
}

export interface SocketUnsubscribePayload {
  type: "unsubscribe";
  events: TelemetryEventType[];
}

type OutgoingMessage =
  | SocketAuthPayload
  | SocketSubscribePayload
  | SocketUnsubscribePayload;

export interface WebSocketManagerOptions {
  /**
   * Example:
   * - ws://localhost:8000/ws/telemetry/{tenant_id}/
   * - wss://api.example.com/ws/telemetry/{tenant_id}/
   */
  baseUrl?: string;
  /**
   * LocalStorage key for tenant id
   */
  tenantStorageKey?: string;
  /**
   * LocalStorage key for JWT token
   */
  tokenStorageKey?: string;
  /**
   * Reconnect config
   */
  reconnect?: {
    enabled?: boolean;
    initialDelayMs?: number;
    maxDelayMs?: number;
    maxAttempts?: number;
    jitterMs?: number;
  };
  /**
   * Optional callbacks for lifecycle hooks
   */
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

type EventCallback<T = unknown> = (message: TelemetryMessage<T>) => void;

const DEFAULT_OPTIONS: Required<
  Omit<WebSocketManagerOptions, "onOpen" | "onClose" | "onError">
> = {
  baseUrl: "ws://localhost:8000/ws/telemetry/{tenant_id}/",
  tenantStorageKey: "dmt-tenant",
  tokenStorageKey: "access_token",
  reconnect: {
    enabled: true,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    maxAttempts: Infinity,
    jitterMs: 250,
  },
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function addJitter(ms: number, jitterMs: number): number {
  if (jitterMs <= 0) return ms;
  const random = Math.floor(Math.random() * (jitterMs * 2 + 1)) - jitterMs; // [-jitterMs, +jitterMs]
  return Math.max(0, ms + random);
}

export class WebSocketConnectionManager {
  private socket: WebSocket | null = null;
  private readonly options: Required<
    Omit<WebSocketManagerOptions, "onOpen" | "onClose" | "onError">
  > &
    Pick<WebSocketManagerOptions, "onOpen" | "onClose" | "onError">;

  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyDisconnected = false;
  private isConnecting = false;

  // eventType -> set of callbacks
  private subscribers = new Map<TelemetryEventType, Set<EventCallback>>();

  // Track subscriptions to re-send after reconnect
  private subscribedEventTypes = new Set<TelemetryEventType>();

  // Queue outgoing messages while socket isn't open
  private pendingMessages: OutgoingMessage[] = [];

  constructor(options?: WebSocketManagerOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      reconnect: {
        ...DEFAULT_OPTIONS.reconnect,
        ...(options?.reconnect ?? {}),
      },
    };
  }

  /**
   * Build socket URL from localStorage tenant.
   */
  private getSocketUrl(): string {
    if (!isBrowser()) {
      throw new Error(
        "[WebSocketManager] Cannot build WebSocket URL during SSR (window/localStorage unavailable)."
      );
    }

    const tenantId = localStorage.getItem(this.options.tenantStorageKey);
    if (!tenantId) {
      throw new Error(
        `[WebSocketManager] Missing tenant id in localStorage key "${this.options.tenantStorageKey}".`
      );
    }

    const baseUrl = this.options.baseUrl.replace("{tenant_id}", encodeURIComponent(tenantId));
    const token = this.getJwtToken();
    if (token) {
      // Append token to query string
      const url = new URL(baseUrl);
      url.searchParams.set('token', token);
      return url.toString();
    }
    return baseUrl;
  }

  private getJwtToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(this.options.tokenStorageKey);
  }

  private log(...args: unknown[]): void {
    console.info("[WebSocketManager]", ...args);
  }

  private warn(...args: unknown[]): void {
    console.warn("[WebSocketManager]", ...args);
  }

  private error(...args: unknown[]): void {
    console.error("[WebSocketManager]", ...args);
  }

  private sendRaw(message: OutgoingMessage): void {
    const data = JSON.stringify(message);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data);
      return;
    }

    // Queue if not open yet (especially during reconnect/auth phase)
    this.pendingMessages.push(message);
  }

  private flushPendingMessages(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (!this.pendingMessages.length) return;

    const queue = [...this.pendingMessages];
    this.pendingMessages = [];

    for (const msg of queue) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  private sendAuth(): void {
    const token = this.getJwtToken();
    if (!token) {
      this.warn(
        `No JWT token found in localStorage key "${this.options.tokenStorageKey}". Continuing without auth payload.`
      );
      return;
    }

    this.sendRaw({
      type: "auth",
      token,
    });
  }

  private restoreSubscriptions(): void {
    const events = Array.from(this.subscribedEventTypes);
    if (!events.length) return;

    this.sendRaw({
      type: "subscribe",
      events,
    });
  }

  private dispatchIncoming(raw: unknown): void {
    let parsed: TelemetryMessage;

    try {
      parsed =
        typeof raw === "string"
          ? (JSON.parse(raw) as TelemetryMessage)
          : (raw as TelemetryMessage);
    } catch (e) {
      this.error("Failed to parse message JSON:", e);
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      this.warn("Ignoring malformed socket message:", parsed);
      return;
    }

    const { eventType } = parsed;
    if (!eventType) {
      this.warn("Incoming message missing eventType:", parsed);
      return;
    }

    const callbacks = this.subscribers.get(eventType);
    if (!callbacks || callbacks.size === 0) return;

    callbacks.forEach((cb) => {
      try {
        cb(parsed);
      } catch (e) {
        this.error(`Subscriber callback failed for event "${eventType}":`, e);
      }
    });
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    const cfg = this.options.reconnect;
    if (!cfg || !cfg.enabled || this.manuallyDisconnected) return;

    const attempts = this.reconnectAttempts;
    const maxAttempts = cfg.maxAttempts ?? Infinity;
    if (attempts >= maxAttempts) {
      this.warn("Max reconnect attempts reached. Giving up.");
      return;
    }

    // exponential backoff: initial * 2^attempts, capped
    const initialDelay = cfg.initialDelayMs ?? 1000;
    const maxDelay = cfg.maxDelayMs ?? 30000;
    const jitter = cfg.jitterMs ?? 250;

    const rawDelay = Math.min(initialDelay * 2 ** attempts, maxDelay);
    const delay = addJitter(rawDelay, jitter);

    this.reconnectAttempts += 1;
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      void this.connect(); // fire and forget safely
    }, delay);
  }

  /**
   * Establish WebSocket connection.
   * SSR safe: no-op when called server-side.
   */
  public async connect(): Promise<void> {
    if (!isBrowser()) {
      // Next.js SSR safety: silently no-op
      this.warn("connect() called during SSR. Skipping WebSocket connection.");
      return;
    }

    if (this.isConnecting) return;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    this.manuallyDisconnected = false;
    this.isConnecting = true;
    this.clearReconnectTimer();

    try {
      const url = this.getSocketUrl();
      this.log("Connecting to", url);

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.log("Connected");
        this.reconnectAttempts = 0;
        this.options.onOpen?.();

        // Authenticate then restore subscriptions
        this.sendAuth();
        this.restoreSubscriptions();
        this.flushPendingMessages();
      };

      this.socket.onmessage = (event: MessageEvent<string>) => {
        this.dispatchIncoming(event.data);
      };

      this.socket.onerror = (event) => {
        this.error("Socket error:", event);
        this.options.onError?.(event);
      };

      this.socket.onclose = (event) => {
        this.log(`Disconnected (code=${event.code}, reason="${event.reason}")`);
        this.options.onClose?.(event);

        // Only reconnect if not intentionally disconnected
        if (!this.manuallyDisconnected) {
          this.scheduleReconnect();
        }
      };

      // A tiny wait allows immediate sync consumers to see connection state transitions
      await sleep(0);
    } catch (e) {
      this.error("connect() failed:", e);
      this.scheduleReconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Intentional disconnect: stops reconnect loop.
   */
  public disconnect(code = 1000, reason = "Client disconnect"): void {
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;

    if (!this.socket) return;

    try {
      if (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      ) {
        this.socket.close(code, reason);
      }
    } catch (e) {
      this.error("disconnect() close error:", e);
    } finally {
      this.socket = null;
    }
  }

  /**
   * Subscribe to a given eventType.
   * Sends subscription frame to server when connected.
   */
  public subscribe<T = unknown>(
    eventType: TelemetryEventType,
    callback: EventCallback<T>
  ): void {
    if (!eventType || typeof callback !== "function") {
      throw new Error("subscribe(eventType, callback) requires valid arguments.");
    }

    const existing = this.subscribers.get(eventType) ?? new Set<EventCallback>();
    existing.add(callback as EventCallback);
    this.subscribers.set(eventType, existing);

    if (!this.subscribedEventTypes.has(eventType)) {
      this.subscribedEventTypes.add(eventType);
      this.sendRaw({
        type: "subscribe",
        events: [eventType],
      });
      this.flushPendingMessages();
    }
  }

  /**
   * Unsubscribe behavior:
   * - unsubscribe(eventType, callback): remove only that callback
   * - unsubscribe(eventType): remove all callbacks for that eventType
   * - unsubscribe(): remove all subscriptions
   */
  public unsubscribe(eventType?: TelemetryEventType, callback?: EventCallback): void {
    // Unsubscribe all
    if (!eventType) {
      const allEvents = Array.from(this.subscribedEventTypes);
      this.subscribers.clear();
      this.subscribedEventTypes.clear();

      if (allEvents.length) {
        this.sendRaw({ type: "unsubscribe", events: allEvents });
        this.flushPendingMessages();
      }
      return;
    }

    const callbacks = this.subscribers.get(eventType);
    if (!callbacks) return;

    if (callback) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(eventType);
        this.subscribedEventTypes.delete(eventType);
        this.sendRaw({ type: "unsubscribe", events: [eventType] });
        this.flushPendingMessages();
      } else {
        this.subscribers.set(eventType, callbacks);
      }
      return;
    }

    // Remove all callbacks for a single eventType
    this.subscribers.delete(eventType);
    this.subscribedEventTypes.delete(eventType);
    this.sendRaw({ type: "unsubscribe", events: [eventType] });
    this.flushPendingMessages();
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public getReadyState(): number | null {
    return this.socket?.readyState ?? null;
  }
}

// Singleton helper (optional, convenient for app-wide use)
let wsManagerSingleton: WebSocketConnectionManager | null = null;

export function getWebSocketManager(
  options?: WebSocketManagerOptions
): WebSocketConnectionManager {
  if (!wsManagerSingleton) {
    wsManagerSingleton = new WebSocketConnectionManager(options);
  }
  return wsManagerSingleton;
}