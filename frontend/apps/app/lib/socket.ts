type Callback = (data: any) => void;

class WSClient {
  private socket: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<Callback>> = new Map();

  private messageQueue: string[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url;
  }

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

  emit(action: string, data: any = {}) {
    const payload = JSON.stringify({ action, ...data });
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
    } else {
      console.warn(`[WSClient] Socket not open, queuing action: ${action}`);
      this.messageQueue.push(payload);
    }
  }

  on(event: string, callback: Callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private dispatchEvent(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  getReadyState() {
    return this.socket ? this.socket.readyState : WebSocket.CLOSED;
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export default WSClient;
