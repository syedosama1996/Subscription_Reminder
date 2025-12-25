#!/usr/bin/env node

/**
 * Script to generate all app icon sizes for iOS and Android
 * Uses @expo/image-utils which is already installed
 */

const fs = require('fs');
const path = require('path');
const { generateImageAsync } = require('@expo/image-utils');

const ICON_SOURCE = path.join(__dirname, '../assets/images/icon.png');
const IOS_ICON_DIR = path.join(__dirname, '../ios/SubscriptionReminder/Images.xcassets/AppIcon.appiconset');
const ANDROID_RES_DIR = path.join(__dirname, '../android/app/src/main/res');

// iOS icon sizes from Contents.json
const IOS_SIZES = [
  { size: 20, scale: 1, idiom: 'ipad', filename: 'App-Icon-20x20@1x.png' },
  { size: 20, scale: 2, idiom: 'iphone', filename: 'App-Icon-20x20@2x.png' },
  { size: 20, scale: 3, idiom: 'iphone', filename: 'App-Icon-20x20@3x.png' },
  { size: 29, scale: 1, idiom: 'ipad', filename: 'App-Icon-29x29@1x.png' },
  { size: 29, scale: 2, idiom: 'iphone', filename: 'App-Icon-29x29@2x.png' },
  { size: 29, scale: 3, idiom: 'iphone', filename: 'App-Icon-29x29@3x.png' },
  { size: 40, scale: 1, idiom: 'ipad', filename: 'App-Icon-40x40@1x.png' },
  { size: 40, scale: 2, idiom: 'iphone', filename: 'App-Icon-40x40@2x.png' },
  { size: 40, scale: 3, idiom: 'iphone', filename: 'App-Icon-40x40@3x.png' },
  { size: 60, scale: 2, idiom: 'iphone', filename: 'App-Icon-60x60@2x.png' },
  { size: 60, scale: 3, idiom: 'iphone', filename: 'App-Icon-60x60@3x.png' },
  { size: 76, scale: 1, idiom: 'ipad', filename: 'App-Icon-76x76@1x.png' },
  { size: 76, scale: 2, idiom: 'ipad', filename: 'App-Icon-76x76@2x.png' },
  { size: 83.5, scale: 2, idiom: 'ipad', filename: 'App-Icon-83.5x83.5@2x.png' },
  { size: 1024, scale: 1, idiom: 'ios-marketing', filename: 'ItunesArtwork@2x.png' },
];

// Android mipmap densities
const ANDROID_DENSITIES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generateIcons() {
  console.log('🎨 Generating app icons...\n');

  if (!fs.existsSync(ICON_SOURCE)) {
    console.error('❌ Source icon not found at:', ICON_SOURCE);
    console.error('   Please place your 1024x1024 PNG icon there first.');
    process.exit(1);
  }

  console.log('✅ Found source icon:', ICON_SOURCE);
  console.log('');

  // Generate iOS icons
  console.log('📱 Generating iOS icons...');
  for (const icon of IOS_SIZES) {
    const outputSize = icon.size * icon.scale;
    const outputPath = path.join(IOS_ICON_DIR, icon.filename);
    
    try {
      await generateImageAsync(
        {
          projectRoot: path.join(__dirname, '..'),
          cacheType: 'icons',
        },
        {
          src: ICON_SOURCE,
          name: icon.filename,
          width: outputSize,
          height: outputSize,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        }
      );
      console.log(`   ✓ Generated ${icon.filename} (${outputSize}x${outputSize})`);
    } catch (error) {
      console.error(`   ✗ Failed to generate ${icon.filename}:`, error.message);
    }
  }

  // Generate Android icons
  console.log('\n🤖 Generating Android icons...');
  for (const [mipmapDir, size] of Object.entries(ANDROID_DENSITIES)) {
    const mipmapPath = path.join(ANDROID_RES_DIR, mipmapDir);
    if (!fs.existsSync(mipmapPath)) {
      fs.mkdirSync(mipmapPath, { recursive: true });
    }

    const foregroundPath = path.join(mipmapPath, 'ic_launcher_foreground.png');
    
    try {
      await generateImageAsync(
        {
          projectRoot: path.join(__dirname, '..'),
          cacheType: 'icons',
        },
        {
          src: ICON_SOURCE,
          name: `ic_launcher_foreground_${mipmapDir}`,
          width: size,
          height: size,
          resizeMode: 'contain',
          backgroundColor: 'transparent',
        }
      );
      console.log(`   ✓ Generated ${mipmapDir}/ic_launcher_foreground.png (${size}x${size})`);
    } catch (error) {
      console.error(`   ✗ Failed to generate ${mipmapDir}:`, error.message);
    }
  }

  console.log('\n✅ Icon generation complete!');
  console.log('\nNext steps:');
  console.log('1. Rebuild your app: npx expo run:android or npx expo run:ios');
  console.log('2. For Android, you may need to uninstall the old app first');
  console.log('3. For iOS, clean build folder in Xcode (Cmd+Shift+K)');
}

generateIcons().catch(console.error);

