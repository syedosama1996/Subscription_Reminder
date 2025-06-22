// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver configuration for better module resolution
config.resolver = {
  ...config.resolver,
  alias: {
    ...config.resolver.alias,
  },
  // Ensure proper resolution of native modules
  platforms: ['ios', 'android', 'native', 'web'],
};

// Add transformer configuration for better performance
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;
