/**
 * User Journey Analytics Tracker
 * Tracks screen views, feature usage, and user engagement
 */

import { logger } from './logger';
import { SentryService } from '../services/SentryService';

type EventType =
  | 'screen_view'
  | 'feature_usage'
  | 'button_click'
  | 'food_logged'
  | 'fasting_started'
  | 'fasting_ended'
  | 'coach_interaction'
  | 'achievement_unlocked'
  | 'error_occurred';

interface AnalyticsEvent {
  eventType: EventType;
  eventName: string;
  timestamp: number;
  properties?: Record<string, any>;
  userId?: string;
}

interface UserJourney {
  userId?: string;
  sessionStart: number;
  events: AnalyticsEvent[];
  screens: string[];
  lastActivity: number;
}

class AnalyticsTracker {
  private journey: UserJourney;
  private readonly maxEvents = 200;
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.journey = {
      sessionStart: Date.now(),
      events: [],
      screens: [],
      lastActivity: Date.now(),
    };
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string) {
    this.journey.userId = userId;
    logger.info('Analytics user ID set', { userId });
  }

  /**
   * Track screen view
   */
  trackScreenView(screenName: string, properties?: Record<string, any>) {
    this.recordEvent({
      eventType: 'screen_view',
      eventName: screenName,
      timestamp: Date.now(),
      properties: {
        ...properties,
        previousScreen: this.journey.screens[this.journey.screens.length - 1] || 'none',
      },
      userId: this.journey.userId,
    });

    this.journey.screens.push(screenName);
    if (this.journey.screens.length > 20) {
      this.journey.screens.shift();
    }

    // Send to Sentry for navigation breadcrumbs
    SentryService.addBreadcrumb({
      message: `Screen: ${screenName}`,
      category: 'navigation',
      level: 'info',
      data: properties,
    });

    logger.info('Screen viewed', {
      screen: screenName,
      ...properties,
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, properties?: Record<string, any>) {
    this.recordEvent({
      eventType: 'feature_usage',
      eventName: featureName,
      timestamp: Date.now(),
      properties,
      userId: this.journey.userId,
    });

    logger.info('Feature used', {
      feature: featureName,
      ...properties,
    });
  }

  /**
   * Track button click
   */
  trackButtonClick(buttonName: string, screen: string, properties?: Record<string, any>) {
    this.recordEvent({
      eventType: 'button_click',
      eventName: buttonName,
      timestamp: Date.now(),
      properties: {
        ...properties,
        screen,
      },
      userId: this.journey.userId,
    });

    logger.debug('Button clicked', {
      button: buttonName,
      screen,
      ...properties,
    });
  }

  /**
   * Track food logged
   */
  trackFoodLogged(foodName: string, calories: number, properties?: Record<string, any>) {
    this.recordEvent({
      eventType: 'food_logged',
      eventName: 'food_entry_created',
      timestamp: Date.now(),
      properties: {
        foodName,
        calories,
        ...properties,
      },
      userId: this.journey.userId,
    });

    logger.info('Food logged', {
      foodName,
      calories,
      ...properties,
    });
  }

  /**
   * Track fasting session
   */
  trackFastingStarted(targetHours: number, properties?: Record<string, any>) {
    this.recordEvent({
      eventType: 'fasting_started',
      eventName: 'fasting_session_started',
      timestamp: Date.now(),
      properties: {
        targetHours,
        ...properties,
      },
      userId: this.journey.userId,
    });

    logger.info('Fasting started', {
      targetHours,
      ...properties,
    });
  }

  trackFastingEnded(actualHours: number, targetHours: number, properties?: Record<string, any>) {
    this.recordEvent({
      eventType: 'fasting_ended',
      eventName: 'fasting_session_ended',
      timestamp: Date.now(),
      properties: {
        actualHours,
        targetHours,
        completed: actualHours >= targetHours,
        ...properties,
      },
      userId: this.journey.userId,
    });

    logger.info('Fasting ended', {
      actualHours,
      targetHours,
      completed: actualHours >= targetHours,
      ...properties,
    });
  }

  /**
   * Track coach interaction
   */
  trackCoachInteraction(coachId: string, interactionType: 'sms' | 'call' | 'message', properties?: Record<string, any>) {
    this.recordEvent({
      eventType: 'coach_interaction',
      eventName: `coach_${interactionType}`,
      timestamp: Date.now(),
      properties: {
        coachId,
        interactionType,
        ...properties,
      },
      userId: this.journey.userId,
    });

    logger.info('Coach interaction', {
      coachId,
      interactionType,
      ...properties,
    });
  }

  /**
   * Track achievement unlocked
   */
  trackAchievement(achievementName: string, properties?: Record<string, any>) {
    this.recordEvent({
      eventType: 'achievement_unlocked',
      eventName: achievementName,
      timestamp: Date.now(),
      properties,
      userId: this.journey.userId,
    });

    logger.info('Achievement unlocked', {
      achievement: achievementName,
      ...properties,
    });
  }

  /**
   * Track error
   */
  trackError(errorMessage: string, errorContext?: Record<string, any>) {
    this.recordEvent({
      eventType: 'error_occurred',
      eventName: errorMessage,
      timestamp: Date.now(),
      properties: errorContext,
      userId: this.journey.userId,
    });

    logger.error('User encountered error', new Error(errorMessage), errorContext);
  }

  /**
   * Get funnel analysis
   */
  getFunnelAnalysis(funnelSteps: string[]): {
    step: string;
    count: number;
    dropoffRate: number;
  }[] {
    const results = [];
    let previousCount = this.journey.events.length;

    for (const step of funnelSteps) {
      const stepEvents = this.journey.events.filter((e) => e.eventName === step);
      const count = stepEvents.length;
      const dropoffRate = previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;

      results.push({
        step,
        count,
        dropoffRate,
      });

      previousCount = count;
    }

    return results;
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const sessionDuration = Date.now() - this.journey.sessionStart;
    const screenViewEvents = this.journey.events.filter((e) => e.eventType === 'screen_view');
    const featureUsageEvents = this.journey.events.filter((e) => e.eventType === 'feature_usage');

    return {
      userId: this.journey.userId,
      sessionDuration: Math.round(sessionDuration / 1000), // in seconds
      totalEvents: this.journey.events.length,
      screenViews: screenViewEvents.length,
      featureUsages: featureUsageEvents.length,
      uniqueScreens: new Set(this.journey.screens).size,
      mostVisitedScreen: this.getMostVisitedScreen(),
      lastActivity: this.journey.lastActivity,
    };
  }

  /**
   * Get most visited screen
   */
  private getMostVisitedScreen(): string | null {
    if (this.journey.screens.length === 0) return null;

    const screenCounts = this.journey.screens.reduce((acc, screen) => {
      acc[screen] = (acc[screen] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostVisited = Object.entries(screenCounts).sort((a, b) => b[1] - a[1])[0];
    return mostVisited ? mostVisited[0] : null;
  }

  /**
   * Record an event
   */
  private recordEvent(event: AnalyticsEvent) {
    this.journey.events.push(event);
    this.journey.lastActivity = Date.now();

    // Keep only the last N events
    if (this.journey.events.length > this.maxEvents) {
      this.journey.events.shift();
    }

    // Check for session timeout
    this.checkSessionTimeout();
  }

  /**
   * Check if session has timed out
   */
  private checkSessionTimeout() {
    const timeSinceLastActivity = Date.now() - this.journey.lastActivity;
    if (timeSinceLastActivity > this.sessionTimeout) {
      logger.info('Session timed out', this.getSessionSummary());
      this.resetSession();
    }
  }

  /**
   * Reset session
   */
  private resetSession() {
    this.journey = {
      userId: this.journey.userId, // Keep user ID
      sessionStart: Date.now(),
      events: [],
      screens: [],
      lastActivity: Date.now(),
    };
  }

  /**
   * Export events for remote shipping
   */
  exportEvents(): AnalyticsEvent[] {
    return [...this.journey.events];
  }

  /**
   * Clear all events
   */
  clearEvents() {
    this.journey.events = [];
  }
}

export const analytics = new AnalyticsTracker();
export default analytics;
