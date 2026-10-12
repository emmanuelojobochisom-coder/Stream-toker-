const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo SDK 53 / React Native 0.79 can hit package-exports resolution
// incompatibilities with some libraries, including Supabase JS.
// Keep Metro on the compatible legacy resolver while diagnosing startup crashes.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
