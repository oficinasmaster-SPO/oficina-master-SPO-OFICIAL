/**
 * Polling Manager for Legacy/Fallback Communication
 * Intelligent polling with backoff and change detection
 */
export class PollingManager {
  constructor() {
    this.pollers = new Map();
    this.lastResults = new Map();
    this.changeListeners = new Map();
  }

  /**
   * Start polling an endpoint
   */
  startPolling(key, fn, options = {}) {
    const {
      interval = 5000,          // Default 5 seconds
      maxInterval = 60000,      // Max 1 minute
      backoffMultiplier = 1.5,  // Exponential backoff
      onData = null,            // Callback on new data
      onChange = null,          // Callback on change only
      compareFunction = null,   // Custom comparison
    } = options;

    // Stop existing polling if any
    if (this.pollers.has(key)) {
      this.stopPolling(key);
    }

    let currentInterval = interval;
    let consecutiveErrors = 0;

    const poll = async () => {
      try {
        const result = await fn();

        // Check for changes
        const lastResult = this.lastResults.get(key);
        const hasChanged = this.hasChanged(key, result, lastResult, compareFunction);

        this.lastResults.set(key, result);

        if (onData) onData(result);
        if (hasChanged && onChange) onChange(result);

        // Reset error counter and interval on success
        consecutiveErrors = 0;
        currentInterval = interval;
      } catch (error) {
        consecutiveErrors++;

        // Exponential backoff on errors
        const backoffFactor = Math.min(
          Math.pow(backoffMultiplier, consecutiveErrors),
          maxInterval / interval
        );
        currentInterval = Math.min(interval * backoffFactor, maxInterval);

        console.warn(`Polling error (attempt ${consecutiveErrors}):`, error);
      }

      // Schedule next poll
      const timeoutId = setTimeout(poll, currentInterval);
      this.pollers.set(key, { timeoutId, poll, fn });
    };

    // Start polling
    const timeoutId = setTimeout(poll, 0);
    this.pollers.set(key, { timeoutId, poll, fn });

    return () => this.stopPolling(key);
  }

  /**
   * Stop polling
   */
  stopPolling(key) {
    const poller = this.pollers.get(key);
    if (poller) {
      clearTimeout(poller.timeoutId);
      this.pollers.delete(key);
      this.lastResults.delete(key);
    }
  }

  /**
   * Manually trigger poll (don't wait for interval)
   */
  async triggerPoll(key) {
    const poller = this.pollers.get(key);
    if (poller) {
      await poller.fn();
    }
  }

  /**
   * Check if data has changed
   */
  hasChanged(key, newData, oldData, compareFunction) {
    if (!oldData) return true;

    if (compareFunction) {
      return compareFunction(newData, oldData);
    }

    // Default: deep comparison
    return JSON.stringify(newData) !== JSON.stringify(oldData);
  }

  /**
   * Get polling status
   */
  getStatus(key) {
    const poller = this.pollers.get(key);
    if (!poller) return null;

    return {
      isPolling: true,
      lastResult: this.lastResults.get(key),
    };
  }

  /**
   * Stop all polling
   */
  stopAll() {
    for (const [key] of this.pollers) {
      this.stopPolling(key);
    }
  }

  /**
   * Get active polling keys
   */
  getActivePollers() {
    return Array.from(this.pollers.keys());
  }
}

// Global singleton
export const pollingManager = new PollingManager();

/**
 * Adaptive polling - switches between WebSocket and polling
 * Tries WebSocket first, falls back to polling
 */
export class AdaptivePoller {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.pollingManager = new PollingManager();
    this.adapters = new Map();
  }

  /**
   * Setup adaptive polling for a resource
   */
  setupAdaptive(key, wsChannel, pollFn, options = {}) {
    const wsAvailable = this.wsManager?.isConnected;

    if (wsAvailable) {
      // Use WebSocket
      this.wsManager.subscribe(wsChannel, (data) => {
        if (options.onData) options.onData(data);
      });

      this.adapters.set(key, { type: 'websocket', channel: wsChannel });
    } else {
      // Fall back to polling
      this.pollingManager.startPolling(key, pollFn, options);
      this.adapters.set(key, { type: 'polling', key });
    }
  }

  /**
   * Switch transport (WS to polling or vice versa)
   */
  switchTransport(key, newTransport) {
    const adapter = this.adapters.get(key);
    if (!adapter) return;

    if (adapter.type === 'websocket' && newTransport === 'polling') {
      this.wsManager.unsubscribe(adapter.channel, () => {});
      console.log(`Switched ${key} from WebSocket to polling`);
    } else if (adapter.type === 'polling' && newTransport === 'websocket') {
      this.pollingManager.stopPolling(key);
      console.log(`Switched ${key} from polling to WebSocket`);
    }
  }

  /**
   * Stop adaptive polling
   */
  stop(key) {
    const adapter = this.adapters.get(key);
    if (!adapter) return;

    if (adapter.type === 'websocket') {
      this.wsManager.unsubscribe(adapter.channel, () => {});
    } else {
      this.pollingManager.stopPolling(key);
    }

    this.adapters.delete(key);
  }

  /**
   * Get transport type
   */
  getTransport(key) {
    const adapter = this.adapters.get(key);
    return adapter?.type || null;
  }
}