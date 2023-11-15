

# Analytics implementation

Implemented solution focuses on tracking user interactions and events.

## Useful links
- GA4 Properties -  [link](https://docs.google.com/document/d/1yoWmgTJUfOGaIIHuPwJSdT3408_BbM_QAwqVQXSHJJI/edit#heading=h.tfpvwbcpo5fj
)
-  GlueOps - Google Analytics [link](https://docs.google.com/spreadsheets/d/1agw7PhV8OJppWvkZoocT_FrxSRRboHuum9VuYhBiaNw/edit#gid=1198684761)
 <br />


## Table of Contents
- [Analytics Providers](#analytics-providers)
- [Analytics Logger Configuration](#analytics-logger-configuration)
- [Tracking User Interactions](#tracking-user-interactions)
- [Event Registration](#event-registration)
- [Usage in Components](#usage-in-components)
- [Configuring `clientId` in docusaurus.config.js](#configuring-clientid-in-docusaurusconfigjs)
 <br />

## Analytics Providers
Analytics providers have been added to enable seamless integration with various analytics services. The current providers include:
- Google Analytics: Integration with Google Analytics for tracking events.
- Console Logger: A new provider for logging events to the console.
- More providers can be added as needed.
 <br />

## Analytics Logger Configuration
The configuration for the analytics logger is done in analytics/analytics.js. It includes:

- Definition of analytics providers.
- Conditions for displaying the analytics logger in the production environment.
- Setting up analytics providers based on specified conditions.
- Tracking User Interactions
- User interactions are tracked using the track-user.js module. It generates a unique client ID, stores it in a cookie, and retrieves it when needed. (This will be send if it's enable in docusaurus.config file)
 <br />

## Events are build with two props
- eventName
- eventProperties
 <br />

## Possible EventNames (string)
    eventName = purchase_dataops_event | git_event | purchase_devops_event | github_event | docs_event | email_event | get_started_event
 <br />

## Possible eventProperties {object}
    {  
        version: LogEventManager.version,
        clientId: LogEventManager.clientId,
        event_category: 'Purchase | GitHub | Email | Docs',
        event_label: 'Purchase DataOps header event | Purchase DevOps header event | Purchase DevOps button event  | Email event | Docs header event | Docs button event | Docs footer event' 
    }
 <br />

## Configuring clientId and Analytics Logger Display in docusaurus.config.js
The configuration of clientId and the control of analytics logger display in the docusaurus.config.js file offer flexibility in tailoring your analytics setup. Follow these steps to customize these settings:

    1. Open your docusaurus.config.js file.
    2. Navigate to the themeConfig configuration section.
    3. Adjust the following flags based on your preferences:
        includeClientId: Set this boolean flag to true if you want to include clientId in your events, or false if you prefer to exclude it.
        isAnalyticsLoggerDisplayedInProd: Set this boolean flag to true if you want to display the analytics logger in the production environment, or false if you wish to hide it.

Note: Both variables can be configured as environment variables for enhanced flexibility.

Example:
   ```js
   module.exports = {
     // ... other configurations
     themeConfig: ({ 
        includeClientId: true,
        isAnalyticsLoggerDisplayedInProd: true,
         // ... other themeConfig configurations
     }),
   };
