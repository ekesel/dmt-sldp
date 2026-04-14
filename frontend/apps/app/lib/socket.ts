/**
 * Callback function type for WebSocket event listeners.
 */
type Callback = (data: unknown) => void;

/**
 * A robust WebSocket client wrapper with automatic reconnection, message queuing,
 * and event-based message handling.
 */
class WSClient {
  private socket: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<Callback>> = new Map();

  private messageQueue: string[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;

  /**
   * Initializes a new WSClient instance.
   * @param url The WebSocket server URL to connect to.
   */
  constructor(url: string) {
    this.url = url;
  }

  /**
   * Returns true if the socket is currently connected and open.
   */
  get isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Establishes a connection to the WebSocket server.
   * Includes logic for avoiding redundant connections and handling max reconnection attempts.
   */
  connect() {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.warn(`[WSClient] Max reconnection attempts (${this.maxReconnectAttempts}) reached for ${this.url}. This is common when the backend is not running locally.`);
      } else {
        console.error(`[WSClient] Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      }
      this.dispatchEvent("error", new Error("Max reconnection attempts reached"));
      return;
    }

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.dispatchEvent("open", null);
      this.flushQueue();
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const type = message.type || "message";
        this.dispatchEvent("message", message);
        this.dispatchEvent(type, message);
      } catch (error) {
        console.error("[WSClient] Error parsing message:", error);
      }
    };

    this.socket.onerror = (error) => {
      // Use warn for localhost to reduce console noise since the backend might not be present
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.warn(`[WSClient] WebSocket error for ${this.url}:`, error);
      } else {
        console.error("[WSClient] WebSocket error:", error);
      }
      this.dispatchEvent("error", error);
    };

    this.socket.onclose = () => {
      this.dispatchEvent("close", null);

      // Auto-reconnect logic
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
      }
    };
  }

  /**
   * Sends any messages that were queued while the socket was disconnected.
   */
  private flushQueue() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.socket.send(message);
        }
      }
    }
  }

  /**
   * Sends an action and payload to the server. 
   * Queues the message if the socket is not currently open.
   * @param action The action identifier string.
   * @param data The payload associated with the action.
   */
  emit(action: string, data: unknown = {}) {
    const payload = JSON.stringify({ action, ...(data as object) });
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
    } else {
      console.warn(`[WSClient] Socket not open, queuing action: ${action}`);
      this.messageQueue.push(payload);
    }
  }

  /**
   * Registers a callback for a specific event type.
   * @param event The event name.
   * @param callback The function to invoke when the event occurs.
   */
  on(event: string, callback: Callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unregisters a callback for a specific event type.
   * @param event The event name.
   * @param callback The function to remove.
   */
  off(event: string, callback: Callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Internal helper to trigger callbacks assigned to an event.
   */
  private dispatchEvent(event: string, data: unknown) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Returns the underlying WebSocket readyState.
   */
  getReadyState(): number {
    if (this.socket) {
      return this.socket.readyState;
    }
    return WebSocket.CLOSED;
  }

  /**
   * Closes the WebSocket connection and prevents further automatic reconnection.
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export default WSClient;
