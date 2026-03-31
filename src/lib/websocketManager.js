/**
 * WebSocket Manager for Real-time Communication
 * Handles connection, reconnection, subscriptions, and cleanup
 */
export class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.listeners = {
      onConnect: [],
      onDisconnect: [],
      onError: [],
      onMessage: [],
    };
  }

  /**
   * Connect to WebSocket
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushQueue();
          this.emit('onConnect');
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
          this.emit('onMessage', data);
        };

        this.ws.onerror = (error) => {
          this.emit('onError', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('onDisconnect');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel, callback) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }

    this.subscriptions.get(channel).push(callback);

    // Send subscription message
    this.send({
      type: 'subscribe',
      channel,
    });

    // Return unsubscribe function
    return () => this.unsubscribe(channel, callback);
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel, callback) {
    if (!this.subscriptions.has(channel)) return;

    const callbacks = this.subscriptions.get(channel);
    const index = callbacks.indexOf(callback);

    if (index > -1) {
      callbacks.splice(index, 1);
    }

    if (callbacks.length === 0) {
      this.subscriptions.delete(channel);
      this.send({
        type: 'unsubscribe',
        channel,
      });
    }
  }

  /**
   * Send message
   */
  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue message if not connected
      this.messageQueue.push(data);
    }
  }

  /**
   * Handle incoming message
   */
  handleMessage(data) {
    const { channel, payload } = data;

    if (channel && this.subscriptions.has(channel)) {
      const callbacks = this.subscriptions.get(channel);
      callbacks.forEach(callback => callback(payload));
    }
  }

  /**
   * Flush queued messages
   */
  flushQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * Attempt reconnection
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms...`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Start heartbeat to detect disconnections
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data = null) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      subscribers: this.subscriptions.size,
      queued: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Global singleton
export let wsManager = null;

/**
 * Initialize WebSocket manager
 */
export function initWebSocket(url) {
  wsManager = new WebSocketManager(url);
  return wsManager.connect();
}

/**
 * Get WebSocket manager
 */
export function getWebSocketManager() {
  return wsManager;
}