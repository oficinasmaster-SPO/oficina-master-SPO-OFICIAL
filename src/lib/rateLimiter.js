/**
 * Token Bucket Rate Limiter
 * Allows bursts while maintaining average rate
 */
export class RateLimiter {
  constructor(tokensPerSecond = 10, burstSize = tokensPerSecond * 2) {
    this.tokensPerSecond = tokensPerSecond;
    this.burstSize = burstSize;
    this.tokens = burstSize;
    this.lastRefillTime = Date.now();
  }

  isAllowed(tokens = 1) {
    this.refillTokens();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  refillTokens() {
    const now = Date.now();
    const timePassed = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = timePassed * this.tokensPerSecond;

    this.tokens = Math.min(this.burstSize, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  getAvailableTokens() {
    this.refillTokens();
    return Math.floor(this.tokens);
  }

  reset() {
    this.tokens = this.burstSize;
    this.lastRefillTime = Date.now();
  }
}

/**
 * Sliding Window Rate Limiter
 * Strict rate limiting over a fixed time window
 */
export class SlidingWindowLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  isAllowed() {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }

  getRemainingRequests() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  reset() {
    this.requests = [];
  }
}

/**
 * Request deduplication & caching
 * Prevents duplicate simultaneous requests
 */
export class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  async execute(key, fn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = fn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear() {
    this.pendingRequests.clear();
  }
}

/**
 * Adaptive Rate Limiter
 * Adjusts limits based on HTTP status codes (429, 503, etc.)
 */
export class AdaptiveRateLimiter {
  constructor(initialRate = 10, minRate = 1, maxRate = 100) {
    this.limiter = new RateLimiter(initialRate, initialRate * 2);
    this.currentRate = initialRate;
    this.minRate = minRate;
    this.maxRate = maxRate;
    this.backoffUntil = 0;
  }

  isAllowed(tokens = 1) {
    const now = Date.now();
    if (now < this.backoffUntil) {
      return false;
    }
    return this.limiter.isAllowed(tokens);
  }

  // Call this when you get a 429 (Too Many Requests) or 503 (Service Unavailable)
  onRateLimitHit(retryAfterSeconds = 60) {
    this.currentRate = Math.max(this.minRate, this.currentRate * 0.5);
    this.limiter = new RateLimiter(this.currentRate, this.currentRate * 2);
    this.backoffUntil = Date.now() + (retryAfterSeconds * 1000);
  }

  // Call this on successful requests to gradually increase rate
  onSuccess() {
    if (this.currentRate < this.maxRate) {
      this.currentRate = Math.min(this.maxRate, this.currentRate * 1.05);
      this.limiter = new RateLimiter(this.currentRate, this.currentRate * 2);
    }
  }

  getBackoffTimeRemaining() {
    return Math.max(0, this.backoffUntil - Date.now());
  }

  reset() {
    this.currentRate = this.maxRate / 2;
    this.backoffUntil = 0;
    this.limiter.reset();
  }
}