import pjson from "../package.json";
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import config from "@generated/docusaurus.config";

// track-user.js
import { setCookie, getClientId } from './track-user';
// analytics-providers.js
import { AnalyticsProvider, analyticsProviders } from './analytics-provider/analytics-provider';

// Constants
// Array to hold analytics providers
let analyticsProvidersArray = [
  analyticsProviders[AnalyticsProvider.GOOGLE_ANALYTICS],
  analyticsProviders[AnalyticsProvider.CONSOLE_LOGGER],
  // Add more providers as needed
];

/**
 * Checks if the analytics logger should be displayed in the production environment.
 *
 * The function considers the `isAnalyticsLoggerDisplayedInProd` configuration in Docusaurus
 * themeConfig and the NODE_ENV environment variable. The logger is displayed in production
 * if `isAnalyticsLoggerDisplayedInProd` is truthy and NODE_ENV is 'production'. Otherwise,
 * it is displayed for other environments.
 *
 * @returns {boolean} Returns `true` if the analytics logger should be displayed, otherwise `true`.
 */
const isAnalyticsLoggerDisplayedInProd = () => {
  const result =
    !!config.themeConfig.isAnalyticsLoggerDisplayedInProd &&
    process.env.NODE_ENV === 'production';

    return result || process.env.NODE_ENV !== 'production';
};
/**
 * Sets the analytics providers based on the specified conditions.
 * @param {string[]} providers - An array of provider names.
 */
const setAnalyticsProviders = (providers) => {
  analyticsProvidersArray = providers
    .map(provider => analyticsProviders[provider])
    .filter(provider => provider !== analyticsProviders[AnalyticsProvider.CONSOLE_LOGGER] && Boolean(provider) && isAnalyticsLoggerDisplayedInProd());
  // Boolean(provider): Filters out any providers that are falsy (undefined, null, false, etc.)
  // isAnalyticsLoggerDisplayedInProd(): Ensures the analytics logger is displayed based on production environment conditions.
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
    const { version, clientId } = LogEventManager;
    const updatedEventProperties = { version, userID: clientId, ...eventProperties };
    try {
      analyticsProvidersArray.forEach(provider => {
        provider.logEvent(eventName, updatedEventProperties);
      });
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }
};

// Set the initial analytics providers (e.g., Google Analytics and Console Logger)
setAnalyticsProviders([AnalyticsProvider.GOOGLE_ANALYTICS, AnalyticsProvider.CONSOLE_LOGGER]);