# Rate Limiting & Request Throttling Guide

## Overview

The app includes comprehensive rate limiting and request throttling utilities to prevent API abuse, handle server rate limits gracefully, and optimize network traffic.

## Key Components

### 1. **Token Bucket Rate Limiter** (`RateLimiter`)
Allows bursts of requests while maintaining an average rate over time.

```javascript
import { RateLimiter } from '@/lib/rateLimiter';

const limiter = new RateLimiter(10, 20); // 10 tokens/sec, burst of 20
if (limiter.isAllowed()) {
  // Make API call
}
```

**Features:**
- Token refill based on elapsed time
- Burst capacity support
- O(1) permission checks

### 2. **Sliding Window Limiter** (`SlidingWindowLimiter`)
Strict rate limiting over a fixed time window (e.g., 100 requests per minute).

```javascript
import { SlidingWindowLimiter } from '@/lib/rateLimiter';

const limiter = new SlidingWindowLimiter(100, 60000); // 100 req/min
if (limiter.isAllowed()) {
  // Make API call
}
const remaining = limiter.getRemainingRequests();
```

### 3. **Adaptive Rate Limiter** (`AdaptiveRateLimiter`)
Automatically adjusts rate limits based on server responses (429, 503).

```javascript
import { AdaptiveRateLimiter } from '@/lib/rateLimiter';

const limiter = new AdaptiveRateLimiter(10, 1, 50); // initial 10, min 1, max 50
if (limiter.isAllowed()) {
  try {
    await makeRequest();
    limiter.onSuccess(); // Gradually increase rate
  } catch (error) {
    if (error.status === 429) {
      limiter.onRateLimitHit(60); // Back off for 60 seconds
    }
  }
}
```

### 4. **Request Deduplicator** (`RequestDeduplicator`)
Prevents duplicate simultaneous requests for the same resource.

```javascript
import { RequestDeduplicator } from '@/lib/rateLimiter';

const deduplicator = new RequestDeduplicator();
const result = await deduplicator.execute('user-123', async () => {
  return await fetchUser('user-123');
});
// If two calls happen simultaneously, only one HTTP request is made
```

## React Hooks

### `useRequestThrottle`
Throttles rapid API calls with optional deduplication.

```javascript
import { useRequestThrottle } from '@/hooks/useRequestThrottle';

function SearchComponent() {
  const { throttle, isWaiting } = useRequestThrottle({ tokensPerSecond: 5 });

  const handleSearch = async (query) => {
    try {
      const result = await throttle(
        async () => {
          const res = await fetch(`/api/search?q=${query}`);
          return res.json();
        },
        `search-${query}` // Deduplication key
      );
      setResults(result);
    } catch (error) {
      console.error('Rate limited:', error.message);
    }
  };

  return (
    <input
      onChange={(e) => handleSearch(e.target.value)}
      disabled={isWaiting}
    />
  );
}
```

### `useAdaptiveThrottle`
Handles 429 responses automatically with adaptive backoff.

```javascript
import { useAdaptiveThrottle } from '@/hooks/useRequestThrottle';

function DataFetcher() {
  const { execute, isBackingOff } = useAdaptiveThrottle({
    initialRate: 10,
    minRate: 1,
    maxRate: 100,
  });

  const loadData = async () => {
    try {
      const data = await execute(async () => {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
      setData(data);
    } catch (error) {
      if (error.message.includes('Rate limited')) {
        // Show retry UI
      }
    }
  };

  return (
    <>
      <button onClick={loadData} disabled={isBackingOff}>
        Load Data {isBackingOff && '(backing off)'}
      </button>
    </>
  );
}
```

### `useDebouncedThrottle`
Debounces rapid function calls, only executing after calls stop for N ms.

```javascript
import { useDebouncedThrottle } from '@/hooks/useRequestThrottle';

function SearchInput() {
  const { debounce, isPending } = useDebouncedThrottle(300);

  const handleInputChange = (e) => {
    debounce(async (query) => {
      const results = await searchAPI(query);
      setResults(results);
    }, e.target.value);
  };

  return (
    <input
      onChange={handleInputChange}
      placeholder={isPending ? 'Searching...' : 'Search'}
    />
  );
}
```

## Global Axios Interceptor

Setup automatic rate limiting for all API calls:

```javascript
// In your API client initialization
import { setupRateLimitingInterceptors } from '@/api/rateLimitingInterceptor';
import axios from 'axios';

const axiosInstance = axios.create();
setupRateLimitingInterceptors(axiosInstance);
```

**What it does:**
- ✅ Checks rate limits before each request
- ✅ Handles 429 (Too Many Requests) responses
- ✅ Handles 503 (Service Unavailable) responses
- ✅ Per-endpoint rate limiting
- ✅ Automatic backoff with exponential recovery

**Monitoring:**
```javascript
import { getRateLimitStatus } from '@/api/rateLimitingInterceptor';

const status = getRateLimitStatus();
console.log(status);
// {
//   global: { currentRate: 15.2, isBackingOff: false, ... },
//   endpoints: [
//     { endpoint: 'GET /api/users', currentRate: 8.5, ... },
//     ...
//   ]
// }
```

## Best Practices

1. **Use appropriate limits for your use case:**
   - Real-time search: 2-5 requests/sec
   - Data fetching: 5-20 requests/sec
   - Bulk operations: 1-5 requests/sec

2. **Always handle 429 errors gracefully:**
   ```javascript
   try {
     await makeRequest();
   } catch (error) {
     if (error.retryAfter) {
       setTimeout(retry, error.retryAfter * 1000);
     }
   }
   ```

3. **Use deduplication for frequently accessed resources:**
   ```javascript
   // Bad: multiple requests for same user
   await Promise.all([
     fetchUser('123'),
     fetchUser('123'),
     fetchUser('123'),
   ]);

   // Good: deduplicator makes one request
   const dedup = new RequestDeduplicator();
   await Promise.all([
     dedup.execute('user-123', () => fetchUser('123')),
     dedup.execute('user-123', () => fetchUser('123')),
     dedup.execute('user-123', () => fetchUser('123')),
   ]);
   ```

4. **Monitor rate limit status in dev tools:**
   ```javascript
   if (process.env.NODE_ENV === 'development') {
     window.rateLimitStatus = getRateLimitStatus;
   }
   ```

## Examples

### Search with debounce + throttle
```javascript
function SmartSearch() {
  const { debounce } = useDebouncedThrottle(400);
  const { throttle } = useRequestThrottle({ tokensPerSecond: 3 });

  const handleSearch = (query) => {
    debounce(async (q) => {
      try {
        const results = await throttle(
          () => api.search(q),
          `search-${q}`
        );
        setResults(results);
      } catch (error) {
        setError('Search failed: ' + error.message);
      }
    }, query);
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

### Adaptive API client
```javascript
const client = {
  async request(endpoint, options) {
    const limiter = new AdaptiveRateLimiter(5, 1, 20);

    let retries = 3;
    while (retries > 0) {
      try {
        if (!limiter.isAllowed()) {
          throw new Error('Rate limited');
        }
        const response = await fetch(endpoint, options);
        limiter.onSuccess();
        return response.json();
      } catch (error) {
        if (error.status === 429) {
          limiter.onRateLimitHit(error.retryAfter || 60);
          retries--;
          await sleep(limiter.getBackoffTimeRemaining());
        } else {
          throw error;
        }
      }
    }
  },
};
``