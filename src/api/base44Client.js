import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

// --- Request Queue and Deduplication for Concurrency Control ---
const originalFetch = window.fetch;

class RequestQueue {
    constructor(concurrency = 5) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
        this.inFlight = new Map();
    }

    async fetch(url, options) {
        const method = options?.method || 'GET';
        
        // Deduplicate GET requests to prevent duplicate calls
        if (method === 'GET') {
            const key = `${url}-${JSON.stringify(options?.headers || {})}`;
            if (this.inFlight.has(key)) {
                const res = await this.inFlight.get(key);
                return res.clone();
            }
            
            const promise = this._enqueue(url, options).finally(() => {
                this.inFlight.delete(key);
            });
            this.inFlight.set(key, promise);
            const res = await promise;
            return res.clone();
        }
        
        return this._enqueue(url, options);
    }

    _enqueue(url, options) {
        return new Promise((resolve, reject) => {
            this.queue.push({ url, options, resolve, reject });
            this._next();
        });
    }

    _next() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;
        this.running++;
        const { url, options, resolve, reject } = this.queue.shift();
        
        originalFetch(url, options)
            .then(resolve)
            .catch(reject)
            .finally(() => {
                this.running--;
                this._next();
            });
    }
}

const globalQueue = new RequestQueue(5);
window.fetch = (url, options) => globalQueue.fetch(url, options);
// ---------------------------------------------------------------

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});