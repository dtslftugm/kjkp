/**
 * Configuration File
 * Update API_URL dengan Google Apps Script deployment URL
 */
var CONFIG = {
  // URL Beta Tester
  //  API_URL: '',

  //URL live
  API_URL: 'https://script.google.com/macros/s/AKfycbxwpnccUG-ZoRafQfDy_hbNa1tSKzWgOD-fT9nylqiwbj3FGuhPCAsxiqmf8u6AJhUfCA/exec',
  APP_NAME: 'Dashboard KJKP DTSL',
  APP_VERSION: '1.0',
  ENVIRONMENT: 'production'
};
window.CONFIG = CONFIG;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
