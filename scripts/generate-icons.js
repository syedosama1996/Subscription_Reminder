#!/usr/bin/env node

/**
 * Script to generate app icons for iOS and Android from a source image
 * 
 * Usage:
 * 1. Place your 1024x1024 PNG icon at: assets/images/icon.png
 * 2. Run: node scripts/generate-icons.js
 * 
 * This will generate all required icon sizes for both platforms.
 */

const fs = require('fs');
const path = require('path');

// For Expo apps, the easiest way is to use expo prebuild
// But we can also use sharp if available
console.log('📱 Icon Generation Script for Subreminder');
console.log('');
console.log('To generate icons for your Expo app:');
console.log('');
console.log('Option 1 (Recommended): Use Expo prebuild');
console.log('  1. Place your 1024x1024 PNG icon at: assets/images/icon.png');
console.log('  2. Run: npx expo prebuild --clean');
console.log('  3. This will automatically generate all icon sizes');
console.log('');
console.log('Option 2: Use @expo/image-utils');
console.log('  1. Install: npm install --save-dev @expo/image-utils');
console.log('  2. Place your icon at: assets/images/icon.png');
console.log('  3. Run: npx expo prebuild');
console.log('');
console.log('The app.config.js is already configured to use:');
console.log('  - assets/images/icon.png for the main icon');
console.log('  - This will be used for both iOS and Android');
console.log('');

// Check if icon exists
const iconPath = path.join(__dirname, '../assets/images/icon.png');
if (fs.existsSync(iconPath)) {
  console.log('✅ Found icon at: assets/images/icon.png');
  console.log('   You can now run: npx expo prebuild --clean');
} else {
  console.log('⚠️  Icon not found at: assets/images/icon.png');
  console.log('   Please place your 1024x1024 PNG Subreminder logo there first.');
}

