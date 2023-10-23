import { LogEventManager } from './analytics';

export const googleAnalyticsProvider = (eventName, eventProperties) => {
  // Log event using Google Analytics
  if (typeof window.gtag === 'function') {
    const updatedEventProperties = {
      version: LogEventManager.version,
      userID: LogEventManager.clientId,
      ...eventProperties,
    };

    window.gtag('event', eventName, updatedEventProperties);
    console.log(`Event ${eventName} logged with properties:`, updatedEventProperties);
  } else {
    console.warn(`window.gtag is not defined. Event ${eventName} was not logged.`);
  }
};
