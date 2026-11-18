const fs = require('fs');
const path = require('path');

// Firebase (push) config: an EAS "file" env var GOOGLE_SERVICES_JSON, or a local google-services.json.
// Optional so a build without it still succeeds (push just stays off).
const local = path.join(__dirname, 'google-services.json');
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(local) ? './google-services.json' : undefined);

module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
});
