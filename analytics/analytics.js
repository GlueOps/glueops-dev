import pjson from "../package.json";
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
// track-user.js
import { setCookie, getClientId } from './track-user';
// analytics-providers.js
import { AnalyticsProvider, analyticsProviders } from './analytics-providers';

// Constants
// Array to hold analytics providers
let analyticsProvidersArray = [
  analyticsProviders[AnalyticsProvider.GOOGLE_ANALYTICS],
  analyticsProviders[AnalyticsProvider.CONSOLE_LOGGER],
  // Add more providers as needed
];

// Function to set the current analytics providers
const setAnalyticsProviders = (providers) => {
  analyticsProvidersArray = providers.map(provider => analyticsProviders[provider]).filter(Boolean);
};

// Singleton module to make sure is executed only once defined with a IIFE function, 
// which means the function is executed immediately when the script is loaded and only once.  
export const LogEventManager = (() => {
  let clientId;
  let version;

  const setup = () => {
    const days =  365;
    clientId = getClientId();
    setCookie('clientId', clientId, days);
    version = pjson.version || 8000; // Default to 8000 if not defined
  };

  // Call setup once
  setup();

  return {
    get clientId() {
      return clientId;
    },
    get version() {
      return version;
    },
  };
})();

// Function to log events with all analytics providers
export const logEvent = (eventName, eventProperties) => {
  if (ExecutionEnvironment.canUseDOM) {
    analyticsProvidersArray.forEach(provider => {
      provider.logEvent(eventName, eventProperties);
    });
  }
};

// Possible Button Event Names
// eventName = purchase_dataops_event | git_event

/* Possible eventProperties
 * {  
      version: LogEventManager.version,
      clientId: LogEventManager.clientId,
      event_category: 'Purchase | GIT | Email | Docs',
      event_label: 'Purchase DataOps header event | Purchase DevOps header event | Purchase DevOps button event  | Email event | Docs header event | Docs button event | Docs footer event' 
    })
 */

// Set the initial analytics providers (e.g., Google Analytics and Console Logger)
setAnalyticsProviders([AnalyticsProvider.GOOGLE_ANALYTICS, AnalyticsProvider.CONSOLE_LOGGER]);