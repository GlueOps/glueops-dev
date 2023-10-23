import { LogEventManager } from './analytics';

export const consoleLoggerProvider = (eventName, eventProperties) => {
    // Log event to console for the console logger implementation
    console.log(`Event ${eventName} logged with properties:`, {
      version: LogEventManager.version,
      userID: LogEventManager.clientId,
      ...eventProperties,
    });
  };