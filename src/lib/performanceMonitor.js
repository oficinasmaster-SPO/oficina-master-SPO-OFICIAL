/**
 * Performance Monitoring & Metrics
 * Tracks page load, rendering, API response times
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.marks = new Map();
    this.thresholds = {
      pageLoad: 3000,    // ms
      apiResponse: 1000, // ms
      renderTime: 500,   // ms
    };
  }

  /**
   * Start measuring a metric
   */
  startMark(name) {
    this.marks.set(name, performance.now());
  }

  /**
   * End measuring and record metric
   */
  endMark(name) {
    if (!this.marks.has(name)) {
      console.warn(`Mark "${name}" not started`);
      return null;
    }

    const startTime = this.marks.get(name);
    const duration = performance.now() - startTime;

    this.recordMetric(name, duration);
    this.marks.delete(name);

    return duration;
  }

  /**
   * Record a metric directly
   */
  recordMetric(name, value, metadata = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metric = {
      value,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const list = this.metrics.get(name);
    list.push(metric);

    // Keep only last 100 measurements per metric
    if (list.length > 100) {
      list.shift();
    }

    // Check threshold
    if (this.thresholds[name] && value > this.thresholds[name]) {
      console.warn(`⚠️ ${name} exceeded threshold: ${value}ms > ${this.thresholds[name]}ms`);
    }

    return value;
  }

  /**
   * Measure function execution time
   */
  async measureAsync(name, fn) {
    this.startMark(name);
    try {
      const result = await fn();
      this.endMark(name);
      return result;
    } catch (error) {
      this.endMark(name);
      throw error;
    }
  }

  /**
   * Measure synchronous function
   */
  measure(name, fn) {
    this.startMark(name);
    try {
      const result = fn();
      this.endMark(name);
      return result;
    } catch (error) {
      this.endMark(name);
      throw error;
    }
  }

  /**
   * Get metric statistics
   */
  getStats(name) {
    const metrics = this.metrics.get(name) || [];
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value);
    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      latest: metrics[metrics.length - 1].value,
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    const result = {};
    for (const [name] of this.metrics) {
      result[name] = this.getStats(name);
    }
    return result;
  }

  /**
   * Get Web Vitals
   */
  getWebVitals() {
    const vitals = {
      fcp: null,     // First Contentful Paint
      lcp: null,     // Largest Contentful Paint
      cls: null,     // Cumulative Layout Shift
      fid: null,     // First Input Delay
      ttfb: null,    // Time to First Byte
    };

    try {
      // First Contentful Paint
      const fcpEntries = performance.getEntriesByName('first-contentful-paint');
      if (fcpEntries.length > 0) {
        vitals.fcp = fcpEntries[0].startTime;
      }

      // Time to First Byte
      const navTiming = performance.getEntriesByType('navigation')[0];
      if (navTiming) {
        vitals.ttfb = navTiming.responseStart;
      }
    } catch (error) {
      console.warn('Could not read Web Vitals:', error);
    }

    return vitals;
  }

  /**
   * Check for memory usage
   */
  getMemoryUsage() {
    if (!performance.memory) {
      return null;
    }

    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usage: (
        (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      ).toFixed(2) + '%',
    };
  }

  /**
   * Set custom threshold
   */
  setThreshold(metricName, ms) {
    this.thresholds[metricName] = ms;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    this.marks.clear();
  }

  /**
   * Export metrics as JSON
   */
  export() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      webVitals: this.getWebVitals(),
      memory: this.getMemoryUsage(),
    };
  }
}

// Global singleton
export const perfMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render time
 */
export function useRenderMetrics(componentName) {
  return (callback) => {
    const startTime = performance.now();

    callback();

    const renderTime = performance.now() - startTime;
    perfMonitor.recordMetric(`render:${componentName}`, renderTime);

    if (renderTime > 50) {
      console.warn(`⚠️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  };
}

/**
 * Measure HTTP request/response times
 */
export function measureHttpRequest(method, url, startTime, endTime) {
  const duration = endTime - startTime;
  const key = `http:${method}:${new URL(url).pathname}`;

  perfMonitor.recordMetric(key, duration, {
    method,
    url,
    status: 'completed',
  });

  return duration;
}