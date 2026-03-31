# Monitoring & Error Tracking Guide

## Overview

Three integrated monitoring systems:

1. **Error Logger** — Centralized error capture & reporting
2. **Performance Monitor** — Page load, API, render metrics
3. **Analytics Tracker** — User behavior, funnels, feature usage

---

## Error Logger

### Setup

```javascript
// In main.jsx or App.jsx entry point
import { errorLogger, setupGlobalErrorHandlers } from '@/lib/errorLogger';

setupGlobalErrorHandlers(); // Catch uncaught errors & unhandled rejections

// Make globally accessible in dev
if (process.env.NODE_ENV === 'development') {
  window.errorLogger = errorLogger;
}
```

### Basic Usage

```javascript
import { errorLogger } from '@/lib/errorLogger';

// Log an error
try {
  riskyOperation();
} catch (error) {
  errorLogger.log(error, {
    context: 'riskyOperation',
    userId: user.id,
  });
}

// Log warnings
errorLogger.warn('Something unexpected happened', {
  userId: user.id,
});

// Log critical errors
errorLogger.critical(error, {
  context: 'paymentProcessing',
  userId: user.id,
});
```

### Accessing Errors

```javascript
// Get all errors
const allErrors = errorLogger.getErrors();

// Filter by severity
const criticalErrors = errorLogger.getErrors({ severity: 'critical' });

// Filter by type
const typeErrors = errorLogger.getErrors({ type: 'TypeError' });

// Filter by date
const recentErrors = errorLogger.getErrors({
  since: '2026-03-31T12:00:00Z',
});

// Get specific error
const error = errorLogger.getError('error-id-123');

// Get statistics
const stats = errorLogger.getStats();
// { total: 15, critical: 2, errors: 8, warnings: 5, info: 0 }
```

### Reporting Errors

```javascript
// Send errors to your backend
await errorLogger.reportErrors('/api/errors', {
  batchSize: 10,
  onlyUnreported: true, // Only send new errors
});
```

---

## Performance Monitor

### Setup

```javascript
import { perfMonitor } from '@/lib/performanceMonitor';

// Make globally accessible in dev
if (process.env.NODE_ENV === 'development') {
  window.perfMonitor = perfMonitor;
}
```

### Measure Function Execution

```javascript
import { perfMonitor } from '@/lib/performanceMonitor';

// Synchronous
perfMonitor.measure('parseJSON', () => {
  return JSON.parse(largeData);
});

// Asynchronous
await perfMonitor.measureAsync('fetchUsers', async () => {
  const res = await fetch('/api/users');
  return res.json();
});

// Manual timing
perfMonitor.startMark('operation');
// ... do something ...
const duration = perfMonitor.endMark('operation');
```

### Get Metrics

```javascript
// Single metric stats
const stats = perfMonitor.getStats('fetchUsers');
// {
//   count: 5,
//   min: 234.5,
//   max: 891.2,
//   avg: 567.3,
//   p50: 512.1,
//   p95: 850.0,
//   p99: 890.0,
//   latest: 234.5
// }

// All metrics
const allMetrics = perfMonitor.getAllMetrics();

// Web Vitals (FCP, LCP, TTFB, etc.)
const vitals = perfMonitor.getWebVitals();

// Memory usage
const memory = perfMonitor.getMemoryUsage();
// {
//   usedJSHeapSize: 45678900,
//   totalJSHeapSize: 67890123,
//   jsHeapSizeLimit: 2197815296,
//   usage: '2.08%'
// }
```

### Set Performance Thresholds

```javascript
// Warn if metric exceeds threshold
perfMonitor.setThreshold('fetchUsers', 1000); // 1 second

// Now if fetchUsers takes > 1s, console warns:
// ⚠️ fetchUsers exceeded threshold: 1234ms > 1000ms
```

### React Hook

```javascript
import { useRenderMetrics } from '@/lib/performanceMonitor';

function MyComponent() {
  const measureRender = useRenderMetrics('MyComponent');

  useEffect(() => {
    // Auto-measures render time
    measureRender(() => {
      // Component is rendered
    });
  }, []);

  return <div>Component</div>;
}
```

---

## Analytics Tracker

### Setup

```javascript
import { analytics } from '@/lib/analyticsTracker';

// Make globally accessible
if (process.env.NODE_ENV === 'development') {
  window.analytics = analytics;
}

// Start session on app load
const sessionId = analytics.startSession(user?.id);
window.sessionId = sessionId;
```

### Track Events

```javascript
import { analytics } from '@/lib/analyticsTracker';

// Generic event
analytics.trackEvent('user_signup', {
  source: 'google',
  plan: 'premium',
});

// Page view
analytics.trackPageView('home', {
  referrer: 'google',
});

// User actions
analytics.trackAction('button_click', 'submit-form', {
  formName: 'contact',
});

// Errors
analytics.trackError('Payment failed', 'PaymentError', {
  amount: 99.99,
});

// Feature usage
analytics.trackFeatureUsage('darkMode', true, {
  from: 'settings',
});
```

### Conversion Funnels

```javascript
// Track funnel steps
analytics.trackFunnelStep('signup', 'step1_email', { email });
analytics.trackFunnelStep('signup', 'step2_password', { hasPassword: true });
analytics.trackFunnelStep('signup', 'step3_confirm', { confirmed: true });
analytics.trackFunnelStep('signup', 'complete', { userId: user.id });

// Get funnel stats
const stats = analytics.getFunnelStats('signup');
// {
//   totalSteps: 4,
//   completions: 45,
//   steps: [
//     { name: 'step1_email', count: 100, conversionRate: '100.00%' },
//     { name: 'step2_password', count: 80, conversionRate: '80.00%' },
//     { name: 'step3_confirm', count: 60, conversionRate: '60.00%' },
//     { name: 'complete', count: 45, conversionRate: '45.00%' }
//   ]
// }
```

### Session Analytics

```javascript
const sessionStats = analytics.getSessionStats();
// {
//   totalSessions: 150,
//   activeSessions: 12,
//   avgSessionDuration: '485s',
//   totalEvents: 3420
// }
```

### Feature Usage Stats

```javascript
const featureStats = analytics.getFeatureUsageStats();
// [
//   { name: 'darkMode', usageRate: '62.50%', used: 50, notUsed: 30 },
//   { name: 'notifications', usageRate: '75.00%', used: 60, notUsed: 20 }
// ]
```

### Export Analytics

```javascript
const report = analytics.getAnalytics();

// Send to backend
await analytics.reportAnalytics('/api/analytics');
```

---

## Monitoring Dashboard

Access all three systems via the dashboard:

```javascript
import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard';

// Add to your admin/dev routes
<Route path="/monitoring" element={<MonitoringDashboard />} />
```

**Features:**
- Real-time error tracking with severity levels
- Performance metrics (avg, p95, p99)
- Web Vitals (FCP, LCP, TTFB)
- Memory usage monitoring
- Session analytics
- Feature usage tracking
- Export monitoring reports
- Clear all data

---

## Best Practices

### ✅ DO
```javascript
// 1. Log with context
errorLogger.log(error, {
  userId: user.id,
  action: 'payment',
  amount: 99.99,
});

// 2. Set meaningful thresholds
perfMonitor.setThreshold('api:POST:/users', 2000);

// 3. Track conversion funnels
analytics.trackFunnelStep('checkout', 'cart_view');
analytics.trackFunnelStep('checkout', 'shipping');
analytics.trackFunnelStep('checkout', 'payment');

// 4. Monitor critical paths
await perfMonitor.measureAsync('dataProcessing', async () => {
  return processData(largeDataset);
});

// 5. Report analytics to backend
setInterval(async () => {
  await analytics.reportAnalytics('/api/analytics');
}, 60000); // Every minute
```

### ❌ DON'T
```javascript
// 1. Log sensitive data
errorLogger.log(error, {
  password: userPassword, // ❌ Never!
  creditCard: cardNumber,
});

// 2. Use generic names
analytics.trackEvent('event', {}); // Too vague

// 3. Overload with events
for (let i = 0; i < 10000; i++) {
  analytics.trackEvent('item_viewed', { id: i }); // Too much!
}

// 4. Ignore thresholds
// If your API regularly takes 5s, set threshold to 5s,
// not 1s. Otherwise constant warnings.

// 5. Forget to end sessions
// Always call analytics.endSession() on logout
```

---

## Debugging

### In Console

```javascript
// View all errors
errorLogger.getErrors();

// Get performance stats
perfMonitor.getStats('fetchUsers');

// View analytics
analytics.getAnalytics();

// Monitor in real-time
setInterval(() => {
  console.log('Pending requests:', perfMonitor.metrics);
  console.log('Total events:', analytics.events.length);
}, 5000);
```

### Export & Share

```javascript
// Export complete report
const report = {
  errors: errorLogger.getErrors(),
  performance: perfMonitor.export(),
  analytics: analytics.getAnalytics(),
};

// Copy to clipboard
copy(JSON.stringify(report));

// Or save as file
const blob = new Blob([JSON.stringify(report, null, 2)]);
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'monitoring-report.json';
a.click();
``