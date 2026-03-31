import { AdaptiveRateLimiter } from '@/lib/rateLimiter';

const globalLimiter = new AdaptiveRateLimiter(20, 2, 100); // 20 req/s, adaptive between 2-100
const endpointLimiters = new Map(); // Per-endpoint limiters

/**
 * Setup rate limiting interceptors on axios instance
 * Handles 429 (Too Many Requests) and 503 (Service Unavailable) responses
 */
export function setupRateLimitingInterceptors(axiosInstance) {
  // Request interceptor — check limits before sending
  axiosInstance.interceptors.request.use(
    (config) => {
      const endpoint = `${config.method?.toUpperCase()} ${config.url}`;
      const endpointLimiter = getEndpointLimiter(endpoint);

      // Check if either global or endpoint limit allows request
      if (!globalLimiter.isAllowed()) {
        const waitTime = globalLimiter.getBackoffTimeRemaining();
        config.metadata = { startTime: Date.now(), rateLimited: true };
        console.warn(`[RateLimit] Global limit hit. Wait ${waitTime}ms`);
      }

      if (!endpointLimiter.isAllowed()) {
        const waitTime = endpointLimiter.getBackoffTimeRemaining();
        config.metadata = { startTime: Date.now(), rateLimited: true };
        console.warn(`[RateLimit] Endpoint limit hit: ${endpoint}. Wait ${waitTime}ms`);
      }

      config.metadata = { startTime: Date.now() };
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor — handle rate limit errors
  axiosInstance.interceptors.response.use(
    (response) => {
      const endpoint = `${response.config.method?.toUpperCase()} ${response.config.url}`;
      const endpointLimiter = getEndpointLimiter(endpoint);

      // On success, gradually increase adaptive limits
      globalLimiter.onSuccess();
      endpointLimiter.onSuccess();

      return response;
    },
    (error) => {
      const endpoint = `${error.config?.method?.toUpperCase()} ${error.config?.url}`;
      const endpointLimiter = getEndpointLimiter(endpoint);

      // Handle rate limit errors
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        globalLimiter.onRateLimitHit(parseInt(retryAfter));
        endpointLimiter.onRateLimitHit(parseInt(retryAfter));

        console.error(`[RateLimit] 429 Too Many Requests for ${endpoint}. Backing off for ${retryAfter}s`);

        // Attach retry info to error for upstream handling
        error.retryAfter = parseInt(retryAfter);
        error.rateLimited = true;
      }

      // Handle service unavailable (often rate-limit related)
      if (error.response?.status === 503) {
        const retryAfter = error.response.headers['retry-after'] || 120;
        globalLimiter.onRateLimitHit(parseInt(retryAfter));

        console.error(`[RateLimit] 503 Service Unavailable. Backing off for ${retryAfter}s`);
        error.retryAfter = parseInt(retryAfter);
        error.serviceUnavailable = true;
      }

      return Promise.reject(error);
    }
  );
}

/**
 * Get or create a limiter for a specific endpoint
 * Each endpoint can have independent rate limits
 */
function getEndpointLimiter(endpoint) {
  if (!endpointLimiters.has(endpoint)) {
    // Default: 10 req/s per endpoint, adaptive between 1-50
    endpointLimiters.set(endpoint, new AdaptiveRateLimiter(10, 1, 50));
  }
  return endpointLimiters.get(endpoint);
}

/**
 * Check if a request can proceed given current rate limits
 */
export function canProceed(endpoint = null) {
  if (!globalLimiter.isAllowed(0)) {
    return false;
  }

  if (endpoint) {
    const endpointLimiter = getEndpointLimiter(endpoint);
    return endpointLimiter.isAllowed(0);
  }

  return true;
}

/**
 * Get status of rate limiters for monitoring/debugging
 */
export function getRateLimitStatus() {
  return {
    global: {
      currentRate: globalLimiter.currentRate,
      isBackingOff: globalLimiter.getBackoffTimeRemaining() > 0,
      backoffTimeRemainingMs: globalLimiter.getBackoffTimeRemaining(),
    },
    endpoints: Array.from(endpointLimiters.entries()).map(([endpoint, limiter]) => ({
      endpoint,
      currentRate: limiter.currentRate,
      isBackingOff: limiter.getBackoffTimeRemaining() > 0,
      backoffTimeRemainingMs: limiter.getBackoffTimeRemaining(),
    })),
  };
}

/**
 * Reset all rate limiters (useful for testing or manual reset)
 */
export function resetAllLimiters() {
  globalLimiter.reset();
  endpointLimiters.forEach(limiter => limiter.reset());
  endpointLimiters.clear();
}