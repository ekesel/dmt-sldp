type Callback = (data: any) => void;

class WSClient {
  private socket: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<Callback>> = new Map();

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

    this.socket = new WebSocket(this.url); //browser initiates the handshake

    this.socket.onopen = () => {
      console.log(`[WSClient] Connected to ${this.url}`);
      this.dispatchEvent("open", null);
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
      console.error("[WSClient] WebSocket error:", error);
      this.dispatchEvent("error", error);
    };

    this.socket.onclose = () => {
      console.log("[WSClient] WebSocket closed");
      this.dispatchEvent("close", null);
    };
  }

  emit(action: string, data: any = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action, ...data }));
    } else {
      console.warn("[WSClient] Cannot emit, socket not open");
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

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export default WSClient;
