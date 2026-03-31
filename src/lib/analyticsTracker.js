import { useEffect } from 'react';

/**
 * Analytics & User Behavior Tracking
 * Tracks user actions, feature usage, conversion funnels
 */
export class AnalyticsTracker {
  constructor() {
    this.events = [];
    this.sessions = new Map();
    this.funnels = new Map();
    this.maxEvents = 1000;
  }

  /**
   * Start a new session
   */
  startSession(userId = null) {
    const sessionId = Math.random().toString(36).substr(2, 9);
    const session = {
      id: sessionId,
      userId,
      startTime: new Date().toISOString(),
      endTime: null,
      events: [],
      duration: 0,
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * End current session
   */
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = new Date().toISOString();
      session.duration = Math.round(
        (new Date(session.endTime) - new Date(session.startTime)) / 1000
      );
    }
  }

  /**
   * Track a user event
   */
  trackEvent(eventName, properties = {}, sessionId = null) {
    const event = {
      id: Math.random().toString(36).substr(2, 9),
      name: eventName,
      timestamp: new Date().toISOString(),
      properties,
      sessionId,
      url: window.location.href,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Add to session if exists
    if (sessionId && this.sessions.has(sessionId)) {
      this.sessions.get(sessionId).events.push(event);
    }

    return event.id;
  }

  /**
   * Track page view
   */
  trackPageView(pageName, properties = {}) {
    return this.trackEvent('page_view', {
      page: pageName,
      referrer: document.referrer,
      ...properties,
    });
  }

  /**
   * Track user action (click, form submit, etc)
   */
  trackAction(action, target, properties = {}) {
    return this.trackEvent(`action:${action}`, {
      target,
      ...properties,
    });
  }

  /**
   * Track error event
   */
  trackError(errorMessage, errorType = 'error', context = {}) {
    return this.trackEvent('error', {
      message: errorMessage,
      type: errorType,
      ...context,
    });
  }

  /**
   * Track funnel step (conversion tracking)
   */
  trackFunnelStep(funnelName, step, properties = {}) {
    if (!this.funnels.has(funnelName)) {
      this.funnels.set(funnelName, []);
    }

    const funnelEntry = {
      step,
      timestamp: new Date().toISOString(),
      properties,
    };

    this.funnels.get(funnelName).push(funnelEntry);

    return this.trackEvent(`funnel:${funnelName}:${step}`, properties);
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName, used = true, properties = {}) {
    return this.trackEvent('feature_usage', {
      feature: featureName,
      used,
      ...properties,
    });
  }

  /**
   * Get events by type
   */
  getEventsByName(eventName) {
    return this.events.filter(e => e.name === eventName);
  }

  /**
   * Get funnel conversion rate
   */
  getFunnelStats(funnelName) {
    const funnel = this.funnels.get(funnelName) || [];
    if (funnel.length === 0) return null;

    const steps = {};
    funnel.forEach(entry => {
      steps[entry.step] = (steps[entry.step] || 0) + 1;
    });

    const stepNames = Object.keys(steps).sort();
    const firstStepCount = steps[stepNames[0]];

    return {
      totalSteps: stepNames.length,
      completions: funnel.length,
      steps: stepNames.map(step => ({
        name: step,
        count: steps[step],
        conversionRate: ((steps[step] / firstStepCount) * 100).toFixed(2) + '%',
      })),
    };
  }

  /**
   * Get session analytics
   */
  getSessionStats() {
    const sessions = Array.from(this.sessions.values());

    if (sessions.length === 0) return null;

    const durations = sessions
      .filter(s => s.duration > 0)
      .map(s => s.duration);

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => !s.endTime).length,
      avgSessionDuration: Math.round(
        durations.reduce((a, b) => a + b, 0) / durations.length
      ) + 's',
      totalEvents: this.events.length,
    };
  }

  /**
   * Get feature usage stats
   */
  getFeatureUsageStats() {
    const features = {};

    this.events
      .filter(e => e.name === 'feature_usage')
      .forEach(e => {
        const feature = e.properties.feature;
        if (!features[feature]) {
          features[feature] = { used: 0, notUsed: 0 };
        }

        if (e.properties.used) {
          features[feature].used++;
        } else {
          features[feature].notUsed++;
        }
      });

    return Object.entries(features).map(([name, stats]) => ({
      name,
      usageRate: ((stats.used / (stats.used + stats.notUsed)) * 100).toFixed(2) + '%',
      ...stats,
    }));
  }

  /**
   * Get all analytics data
   */
  getAnalytics() {
    return {
      timestamp: new Date().toISOString(),
      events: this.events.slice(-100),
      sessions: this.getSessionStats(),
      funnels: Array.from(this.funnels.entries()).reduce((acc, [name]) => {
        acc[name] = this.getFunnelStats(name);
        return acc;
      }, {}),
      features: this.getFeatureUsageStats(),
    };
  }

  /**
   * Send analytics to backend
   */
  async reportAnalytics(endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.getAnalytics()),
      });

      return { success: response.ok, status: response.status };
    } catch (error) {
      console.error('Failed to report analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all analytics
   */
  clear() {
    this.events = [];
    this.sessions.clear();
    this.funnels.clear();
  }
}

// Global singleton
export const analytics = new AnalyticsTracker();

/**
 * React hook for tracking page/component view
 */
export function usePageTracking(pageName) {
  useEffect(() => {
    analytics.trackPageView(pageName);
  }, [pageName]);
}

/**
 * Decorator for tracking function calls
 */
export function trackCall(eventName) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args) {
      analytics.trackAction('function_call', propertyKey, {
        eventName,
        args: args.length,
      });

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}