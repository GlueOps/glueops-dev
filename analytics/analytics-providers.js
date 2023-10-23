import { LogEventManager } from './analytics';
import { googleAnalyticsProvider } from './google-analytics-provider';
import { consoleLoggerProvider } from './logger-analytics-provider';

export const AnalyticsProvider = {
    GOOGLE_ANALYTICS: 'googleAnalytics',
    CONSOLE_LOGGER: 'consoleLogger', // New provider
    // Add more providers as needed
  };
  
export const analyticsProviders = {
    [AnalyticsProvider.GOOGLE_ANALYTICS]: {
        logEvent: googleAnalyticsProvider,
    },
    [AnalyticsProvider.CONSOLE_LOGGER]: {
        logEvent: consoleLoggerProvider,
    },
    // Add more analytics providers as needed
};