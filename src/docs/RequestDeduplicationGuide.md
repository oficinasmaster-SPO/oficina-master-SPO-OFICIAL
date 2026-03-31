# API Request Deduplication Guide

## Overview

Request deduplication prevents duplicate simultaneous API calls, reducing server load and improving performance. The app provides multiple levels of deduplication:

1. **Component-level** (via React hooks)
2. **Global** (via manager singleton)
3. **Automatic** (via axios interceptor)

## Key Concepts

### What is Deduplication?
When the same request is made multiple times simultaneously:
```javascript
// Without deduplication: 3 HTTP requests
Promise.all([
  fetchUser('123'),    // HTTP GET /users/123
  fetchUser('123'),    // HTTP GET /users/123
  fetchUser('123'),    // HTTP GET /users/123
]);

// With deduplication: 1 HTTP request, 3 awaited responses
Promise.all([
  deduplicate('user-123', () => fetchUser('123')),
  deduplicate('user-123', () => fetchUser('123')),
  deduplicate('user-123', () => fetchUser('123')),
]);
// All three get the SAME response object
```

---

## React Hooks (Component Level)

### 1. **useRequestDeduplication**
Basic deduplication without caching.

```javascript
import { useRequestDeduplication } from '@/hooks/useRequestDeduplication';

function UserProfile({ userId }) {
  const { deduplicate } = useRequestDeduplication();

  const loadUser = async () => {
    const user = await deduplicate(`user-${userId}`, async () => {
      const res = await fetch(`/api/users/${userId}`);
      return res.json();
    });
    setUser(user);
  };

  useEffect(() => {
    loadUser();
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

**Methods:**
- `deduplicate(key, fn)` — Execute with deduplication
- `getPending()` — Get list of in-flight request keys
- `clear()` — Clear all pending requests

---

### 2. **useCachedDeduplication**
Deduplication + caching with TTL.

```javascript
import { useCachedDeduplication } from '@/hooks/useRequestDeduplication';

function UsersList() {
  const { request } = useCachedDeduplication({ ttl: 5000 }); // 5 sec cache

  const fetchUsers = async () => {
    // First call: HTTP request
    let users = await request('users-list', async () => {
      const res = await fetch('/api/users');
      return res.json();
    });

    // Second call (within 5s): returns cached result, no HTTP
    users = await request('users-list', async () => {
      const res = await fetch('/api/users');
      return res.json();
    });

    // After 5s: cache expires, new HTTP request
    setTimeout(async () => {
      users = await request('users-list', async () => {
        const res = await fetch('/api/users');
        return res.json();
      });
    }, 6000);
  };

  return <button onClick={fetchUsers}>Load Users</button>;
}
```

**Methods:**
- `request(key, fn)` — Execute with caching + dedup
- `invalidate(key)` — Clear cache for specific key
- `invalidateAll()` — Clear entire cache
- `getCacheSize()` — Get number of cached items

---

### 3. **useBatchedDeduplication**
Collect requests over a window and execute in batch.

```javascript
import { useBatchedDeduplication } from '@/hooks/useRequestDeduplication';

function UserBatch() {
  const { batchRequest } = useBatchedDeduplication({ batchDelayMs: 50 });

  const loadMultipleUsers = async () => {
    // All three requests batched into one HTTP call
    const [user1, user2, user3] = await Promise.all([
      batchRequest('user-1-key', () => fetchUser('1')),
      batchRequest('user-2-key', () => fetchUser('2')),
      batchRequest('user-3-key', () => fetchUser('3')),
    ]);

    return [user1, user2, user3];
  };

  return <button onClick={loadMultipleUsers}>Batch Load</button>;
}
```

---

### 4. **useSmartDeduplication**
Per-endpoint deduplication with custom key generation.

```javascript
import { useSmartDeduplication } from '@/hooks/useRequestDeduplication';

function SearchUsers() {
  const { execute, clear } = useSmartDeduplication();

  const search = async (query) => {
    const results = await execute(
      '/api/search',           // endpoint
      `query:${query}`,        // composite key
      () => fetch(`/api/search?q=${query}`).then(r => r.json())
    );
    setResults(results);
  };

  const handleClear = () => {
    clear('/api/search'); // Clear dedup cache for search endpoint
  };

  return (
    <div>
      <input onChange={(e) => search(e.target.value)} />
      <button onClick={handleClear}>Clear Cache</button>
    </div>
  );
}
```

---

## Global Manager (App Level)

### RequestDeduplicationManager

Use for global state or backend functions:

```javascript
import { dedupManager } from '@/lib/requestDeduplicationManager';

// Single request
const user = await dedupManager.execute(
  'user-123',
  () => fetchUser('123'),
  { cache: true, ttl: 5000 }
);

// Batch requests
const [users, posts, comments] = await dedupManager.batch([
  { key: 'users', fn: () => fetchUsers(), cache: true, ttl: 5000 },
  { key: 'posts', fn: () => fetchPosts(), cache: true, ttl: 3000 },
  { key: 'comments', fn: () => fetchComments() },
]);

// Get stats
const stats = dedupManager.getStats();
console.log(stats);
// {
//   totalRequests: 150,
//   dedupedRequests: 45,
//   cachedResponses: 20,
//   deduplicationRate: '30%',
//   pendingRequests: 2,
//   cacheSize: 15,
// }
```

**Methods:**
- `execute(key, fn, options)` — Execute with dedup
- `batch(requests)` — Batch multiple requests
- `invalidate(key)` — Clear specific cache entry
- `invalidateAll()` — Clear all cache
- `getStats()` — Get dedup metrics
- `clear()` — Clear all data

---

## Automatic Axios Interceptor

### Setup

```javascript
// In your API initialization (e.g., api/base44Client.js)
import { setupDeduplicationInterceptor } from '@/api/deduplicationInterceptor';
import axios from 'axios';

const axiosInstance = axios.create();

setupDeduplicationInterceptor(axiosInstance, {
  methods: ['GET'],                           // Only deduplicate GET
  excludeUrls: ['/api/webhook', '/api/sync'], // Don't deduplicate these
  cacheGET: true,                             // Cache GET responses
  cacheTTL: 5000,                             // 5 second cache TTL
});
```

### Options

```javascript
setupDeduplicationInterceptor(axiosInstance, {
  methods: ['GET'],                    // HTTP methods to deduplicate
  excludeUrls: [],                     // URL patterns to skip
  cacheGET: true,                      // Cache GET responses
  cacheTTL: 0,                         // Cache TTL in ms (0 = no cache)
  generateKey: customKeyGenerator,     // Custom key function
});
```

### Helper Functions

```javascript
import {
  dedupFetch,
  dedupBatch,
  getDedupStats,
  clearDedupCache,
  monitorDeduplication,
} from '@/api/deduplicationInterceptor';

// Single fetch
const response = await dedupFetch('/api/users', () => fetch('/api/users'));

// Batch fetch
const [users, posts] = await dedupBatch([
  { key: 'users', fn: () => fetch('/api/users') },
  { key: 'posts', fn: () => fetch('/api/posts') },
]);

// Monitor in dev
if (process.env.NODE_ENV === 'development') {
  monitorDeduplication(5000); // Log stats every 5 sec
}

// Clear cache
clearDedupCache('users');      // Clear specific key
clearDedupCache();             // Clear all
```

---

## Key Generation Helpers

```javascript
import {
  generateCacheKey,
  createSearchKey,
  createPaginationKey,
} from '@/lib/requestDeduplicationManager';

// Generic key from endpoint + params
const key1 = generateCacheKey('/api/users', { id: '123', role: 'admin' });
// → "/api/users?id=123&role=admin"

// Search-specific key
const key2 = createSearchKey('/api/search', 'react', { category: 'tutorials' });
// → "/api/search:query=react&category=tutorials"

// Pagination key
const key3 = createPaginationKey('/api/posts', 2, 20, '-created_at');
// → "/api/posts:page=2&limit=20&sort=-created_at"
```

---

## Best Practices

### ✅ DO
```javascript
// 1. Use composite keys for complex queries
const key = `search:${query}:category=${category}`;

// 2. Set appropriate TTLs
const { request } = useCachedDeduplication({ ttl: 5000 }); // 5 sec

// 3. Monitor dedup effectiveness
const stats = dedupManager.getStats();

// 4. Clear cache on mutations
await updateUser(id);
dedupManager.invalidate(`user-${id}`);
```

### ❌ DON'T
```javascript
// 1. Reuse dedup keys across unrelated requests
const key = 'data'; // Too generic!

// 2. Cache POST/PUT/DELETE responses
// Only cache GET by default

// 3. Set very long TTLs
// Cache can become stale; 5-10 sec is usually ideal

// 4. Forget to invalidate on mutations
// Users see stale data after updates
```

---

## Example: Real-World Search Component

```javascript
import { useRequestDeduplication } from '@/hooks/useRequestDeduplication';
import { useDebouncedThrottle } from '@/hooks/useRequestThrottle';
import { createSearchKey } from '@/lib/requestDeduplicationManager';

function SmartSearch() {
  const { deduplicate } = useRequestDeduplication();
  const { debounce } = useDebouncedThrottle(300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = (query, category = 'all') => {
    setLoading(true);

    debounce(async (q, cat) => {
      try {
        const key = createSearchKey('/api/search', q, { category: cat });

        const data = await deduplicate(key, async () => {
          const res = await fetch(
            `/api/search?query=${q}&category=${cat}`
          );
          return res.json();
        });

        setResults(data);
      } finally {
        setLoading(false);
      }
    }, query, category);
  };

  return (
    <div>
      <input
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />
      {loading && <span>Searching...</span>}
      <ul>
        {results.map(result => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Debugging

### Enable stats logging:
```javascript
// In development
if (process.env.NODE_ENV === 'development') {
  window.dedupManager = dedupManager;
  monitorDeduplication(5000);
}

// Then in console:
// dedupManager.getStats()
```

### Check pending requests:
```javascript
const pending = dedupManager.getPendingCount();
console.log(`${pending} requests in flight`);
```

### Clear everything:
```javascript
dedupManager.clear();
dedupManager.resetStats();
``