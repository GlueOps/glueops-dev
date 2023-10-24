### Analytics implementation

## Overview
The implemented solution focuses on tracking user interactions and events.

## Table of Contents
- Analytics Providers
- Analytics Logger Configuration
- Tracking User Interactions
- Event Registration
- Usage in Components

## Analytics Providers
Analytics providers have been added to enable seamless integration with various analytics services. The current providers include:
- Google Analytics: Integration with Google Analytics for tracking events.
- Console Logger: A new provider for logging events to the console.
- More providers can be added as needed.

## Analytics Logger Configuration
The configuration for the analytics logger is done in analytics/analytics.js. It includes:

- Definition of analytics providers.
- Conditions for displaying the analytics logger in the production environment.
- Setting up analytics providers based on specified conditions.
- Tracking User Interactions
- User interactions are tracked using the track-user.js module. It generates a unique client ID, stores it in a cookie, and retrieves it when needed.

## Events are build with two props (@TODO complete)
- eventName
- eventProperties

## Possible EventNames (string) (@TODO complete)
    eventName = purchase_dataops_event | git_event | purchase_devops_event | github_event | docs_event

## Possible eventProperties {object} (@TODO complete)
    {  
        version: LogEventManager.version,
        clientId: LogEventManager.clientId,
        event_category: 'Purchase | GIT | Email | Docs',
        event_label: 'Purchase DataOps header event | Purchase DevOps header event | Purchase DevOps button event  | Email event | Docs header event | Docs button event | Docs footer event' 
    }
