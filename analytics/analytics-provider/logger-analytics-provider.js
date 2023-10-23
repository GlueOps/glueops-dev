export const consoleLoggerProvider = (eventName, eventProperties) => {
    // Log event to console for the console logger implementation
    console.log(`Event ${eventName} logged with properties:`, eventProperties);
  };