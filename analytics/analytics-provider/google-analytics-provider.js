export const googleAnalyticsProvider = (eventName, eventProperties) => {
  // Log event using Google Analytics
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventProperties);
    console.log(`Event ${eventName} logged with properties:`, eventProperties);
  } else {
    console.warn(`window.gtag is not defined. Event ${eventName} was not logged.`);
  }
};
