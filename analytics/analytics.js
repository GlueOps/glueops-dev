import { setCookie, getClientId } from './trackUser';
import pjson from "../package.json";
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

// Singleton module to make sure is executed only once defined with a IIFE function, 
// which means the function is executed immediately when the script is loaded and only once.  
const LogEventManager = (() => {
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

// @TODO define name convention, as recomendation for clarity could be ok UPPERCASE_WITH_UNDERSCORE
// Possible Button Event Names
// eventName = purchase_button_clicked_event | git_button_clicked_event

/* Possible eventProperties
 * {  
      version: LogEventManager.version,
      clientId: LogEventManager.clientId,
      event_category: 'Purchase | GIT',
      event_label: 'Purchase DataOps | Access Github',
    })
 */

export const logEvent = (eventName, eventProperties) => {
  if (ExecutionEnvironment.canUseDOM) {
    // Log a custom event
    const updatedEventProperties = {
      version: LogEventManager.version,
      userID: LogEventManager.clientId,
      ...eventProperties,
    };

    // Check if window.gtag is defined before triggering the event
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, updatedEventProperties);
      console.log(`Event ${eventName} logged with properties:`, updatedEventProperties);
    } else {
      console.warn(`window.gtag is not defined. Event ${eventName} was not logged.`);
    }
  }
};