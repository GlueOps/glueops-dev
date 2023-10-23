import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

function generateClientId() {
    // Generate a unique identifier
    return 'user_' + Math.random().toString(36).substring(2, 9);
  }
  
  function setCookie(name, value, days) {
    if (ExecutionEnvironment.canUseDOM) {
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }
  }
  
  function getClientId() {
    if (ExecutionEnvironment.canUseDOM) {
      let clientId = localStorage.getItem('clientId');
      if (!clientId) {
        clientId = generateClientId();
        localStorage.setItem('clientId', clientId);
      }
      console.log(`CliendId generated ${getClientId}`);
    
      return clientId;
    }
  }
  
  
  export { setCookie, getClientId };