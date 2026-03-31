# WebSockets & Real-time Communication Guide

## Overview

Three strategies for real-time updates:

1. **WebSockets** — Bi-directional, low-latency, persistent connection
2. **Polling** — Request-based, stateless, easier fallback
3. **Adaptive** — Automatic WS → Polling fallback

---

## Real-time vs Polling Comparison

| Feature | WebSocket | Polling |
|---------|-----------|---------|
| **Latency** | <100ms | 5000-10000ms |
| **Bandwidth** | Very Low | High (repeated requests) |
| **Server Load** | Medium (persistent) | High (constant requests) |
| **Complexity** | Medium | Low |
| **Fallback** | Polling | None |
| **Browser Support** | 98%+ | 100% |
| **Battery** | Better | Worse |
| **Use Case** | Chat, notifications, live data | Occasional updates, fallback |

---

## WebSocket Setup

### Initialize

```javascript
// In App.jsx or main.jsx
import { initWebSocket } from '@/lib/websocketManager';

useEffect(() => {
  initWebSocket('wss://api.example.com/ws')
    .then(() => console.log('WS connected'))
    .catch(error => console.error('WS failed:', error));
}, []);
```

### Subscribe to Channel

```javascript
import { getWebSocketManager } from '@/lib/websocketManager';

const ws = getWebSocketManager();

// Subscribe
const unsubscribe = ws.subscribe('user-123:notifications', (data) => {
  console.log('New notification:', data);
});

// Unsubscribe
unsubscribe();
```

### Send Message

```javascript
ws.send({
  type: 'action',
  action: 'updateProfile',
  payload: { name: 'John' },
});
```

### Listen for Connection Events

```javascript
ws.on('onConnect', () => {
  console.log('Connected!');
});

ws.on('onDisconnect', () => {
  console.log('Disconnected');
});

ws.on('onError', (error) => {
  console.error('WS Error:', error);
});
```

---

## WebSocket React Hooks

### useWebSocket — Subscribe to Channel

```javascript
import { useWebSocket } from '@/hooks/useWebSocket';

function NotificationCenter() {
  const { data: notification, error } = useWebSocket(
    'user-123:notifications',
    (data) => console.log('New notification:', data)
  );

  return (
    <div>
      {notification && <p>🔔 {notification.message}</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### useRealtimeData — Auto-fallback to Polling

```javascript
import { useRealtimeData } from '@/hooks/useWebSocket';

function UserList() {
  const { data: users, loading, transportType } = useRealtimeData(
    'users:list',
    async () => {
      const res = await fetch('/api/users');
      return res.json();
    },
    { pollInterval: 5000 }
  );

  return (
    <div>
      <p>Transport: {transportType}</p> {/* 'websocket' or 'polling' */}
      {loading && <p>Loading...</p>}
      {users?.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}
```

### useWebSocketStatus — Monitor Connection

```javascript
import { useWebSocketStatus } from '@/hooks/useWebSocket';

function ConnectionStatus() {
  const { isConnected, subscribers, queued } = useWebSocketStatus();

  return (
    <div>
      <p>Connected: {isConnected ? '✅' : '❌'}</p>
      <p>Subscribers: {subscribers}</p>
      <p>Queued: {queued}</p>
    </div>
  );
}
```

---

## Polling Setup

### Basic Polling

```javascript
import { pollingManager } from '@/lib/pollingManager';

const unsubscribe = pollingManager.startPolling(
  'user-data',
  async () => {
    const res = await fetch('/api/user');
    return res.json();
  },
  {
    interval: 5000,           // 5 seconds
    onData: (data) => {
      console.log('New data:', data);
    },
    onChange: (data) => {
      console.log('Data changed:', data);
    },
  }
);

// Stop polling
unsubscribe();
```

### Polling with Backoff

```javascript
pollingManager.startPolling('expensive-operation', expensiveFn, {
  interval: 5000,        // Start at 5s
  maxInterval: 60000,    // Cap at 60s
  backoffMultiplier: 2,  // Double on error
  onData: handleData,
});

// On error: 5s → 10s → 20s → 40s → 60s (capped)
```

### Custom Comparison

```javascript
pollingManager.startPolling('app-state', fetchState, {
  interval: 5000,
  compareFunction: (newData, oldData) => {
    // Only trigger onChange if count differs
    return newData.count !== oldData.count;
  },
  onChange: (data) => console.log('Count changed!'),
});
```

### usePolling Hook

```javascript
import { usePolling } from '@/hooks/useWebSocket';

function Dashboard() {
  const { data: stats, isPolling } = usePolling(
    'dashboard-stats',
    async () => {
      const res = await fetch('/api/stats');
      return res.json();
    },
    { interval: 10000 }
  );

  return (
    <div>
      {isPolling && <p>Polling active...</p>}
      {stats && <p>Views: {stats.views}</p>}
    </div>
  );
}
```

---

## Adaptive Real-time (WS → Polling Fallback)

### Auto-fallback Hook

```javascript
import { useRealtimeData } from '@/hooks/useWebSocket';

function ChatRoom({ roomId }) {
  const { data: messages, transportType } = useRealtimeData(
    `room-${roomId}:messages`,
    async () => {
      const res = await fetch(`/api/rooms/${roomId}/messages`);
      return res.json();
    },
    { pollInterval: 3000 }
  );

  return (
    <div>
      <p>Using: {transportType === 'websocket' ? '⚡ WS' : '🔄 Polling'}</p>
      {messages?.map(msg => <div key={msg.id}>{msg.text}</div>)}
    </div>
  );
}
```

### Manual Adaptive Setup

```javascript
import { AdaptivePoller } from '@/lib/pollingManager';
import { getWebSocketManager } from '@/lib/websocketManager';

const adaptive = new AdaptivePoller(getWebSocketManager());

adaptive.setupAdaptive(
  'notifications',
  'user:notifications',     // WS channel
  async () => {             // Fallback polling function
    const res = await fetch('/api/notifications');
    return res.json();
  },
  {
    pollInterval: 5000,
    onData: (data) => console.log('New notification:', data),
  }
);

// Switch transport if needed
adaptive.switchTransport('notifications', 'polling');
adaptive.switchTransport('notifications', 'websocket');

// Stop
adaptive.stop('notifications');
```

---

## Best Practices

### ✅ DO

```javascript
// 1. Use WebSocket for low-latency updates
const { data: cursor } = useWebSocket('room:cursor', handleCursorMove);

// 2. Use polling as fallback
const { data, transportType } = useRealtimeData(
  'user-profile',
  fetchProfile,
  { pollInterval: 5000 }
);

// 3. Set reasonable poll intervals
// - Notifications: 5-10s
// - User data: 10-30s
// - Analytics: 30-60s
// - Static data: 60s+

// 4. Use onChange for expensive operations
pollingManager.startPolling('data', fetch, {
  interval: 5000,
  onChange: expensiveUpdate, // Only when data changes
  onData: lightweightUpdate,
});

// 5. Clean up subscriptions
useEffect(() => {
  const unsubscribe = ws.subscribe('channel', handler);
  return () => unsubscribe();
}, []);
```

### ❌ DON'T

```javascript
// 1. Don't poll for real-time chat
// Use WebSocket instead

// 2. Don't poll too frequently
// Every 100ms destroys your server!

// 3. Don't forget to unsubscribe
// Memory leaks and ghost listeners

// 4. Don't send massive payloads over WS
// Fragment into smaller messages

// 5. Don't rely on polling without knowing latency
// Polling is 5-10 seconds slower

// 6. Don't ignore backoff on errors
// Retrying instantly makes things worse
```

---

## Real-world Examples

### Example 1: Live Notifications

```javascript
import { useWebSocket } from '@/hooks/useWebSocket';
import { useState } from 'react';

function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  
  const { data: newNotif } = useWebSocket(
    `user-${userId}:notifications`,
    (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 10));
    }
  );

  return (
    <div>
      🔔 {notifications.length}
      {notifications.map(n => (
        <div key={n.id}>{n.message}</div>
      ))}
    </div>
  );
}
```

### Example 2: Real-time Dashboard (WS fallback)

```javascript
import { useRealtimeData } from '@/hooks/useWebSocket';

function Dashboard() {
  const { data: metrics, transportType } = useRealtimeData(
    'dashboard:metrics',
    async () => {
      const res = await fetch('/api/metrics');
      return res.json();
    },
    { pollInterval: 10000 }
  );

  return (
    <div>
      <p>Connection: {transportType}</p>
      <PerformanceChart data={metrics} />
      <UsersChart data={metrics} />
    </div>
  );
}
```

### Example 3: Fallback with Error Handling

```javascript
import { useRealtimeData } from '@/hooks/useWebSocket';

function UserProfiles({ users }) {
  const [profileData, setProfileData] = useState({});

  // Load each user with adaptive transport
  useEffect(() => {
    users.forEach(user => {
      useRealtimeData(
        `user-${user.id}:profile`,
        async () => {
          const res = await fetch(`/api/users/${user.id}`);
          return res.json();
        }
      );
    });
  }, [users]);

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} profile={profileData[user.id]} />
      ))}
    </div>
  );
}
```

---

## Debugging

### Check Connection Status

```javascript
const ws = getWebSocketManager();
console.log(ws.getStatus());
// { isConnected: true, subscribers: 5, queued: 0 }
```

### Monitor Polling

```javascript
console.log(pollingManager.getActivePollers());
// ['user-data', 'dashboard-stats']
```

### See What's Queued

```javascript
if (!ws.isConnected) {
  console.log('Queued messages:', ws.messageQueue);
}
```

### Force Reconnect

```javascript
ws.disconnect();
ws.connect();
``