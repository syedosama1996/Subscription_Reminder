#!/usr/bin/env node

/**
 * Generate all app icon sizes for iOS and Android using sharp
 * This script will create all required icon sizes from assets/images/icon.jpg
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICON_SOURCE = path.join(__dirname, '../assets/images/icon.jpg');
const IOS_ICON_DIR = path.join(__dirname, '../ios/SubscriptionReminder/Images.xcassets/AppIcon.appiconset');
const ANDROID_RES_DIR = path.join(__dirname, '../android/app/src/main/res');

// iOS icon sizes
const IOS_ICONS = [
  { size: 20, scale: 1, filename: 'App-Icon-20x20@1x.png' },
  { size: 20, scale: 2, filename: 'App-Icon-20x20@2x.png' },
  { size: 20, scale: 3, filename: 'App-Icon-20x20@3x.png' },
  { size: 29, scale: 1, filename: 'App-Icon-29x29@1x.png' },
  { size: 29, scale: 2, filename: 'App-Icon-29x29@2x.png' },
  { size: 29, scale: 3, filename: 'App-Icon-29x29@3x.png' },
  { size: 40, scale: 1, filename: 'App-Icon-40x40@1x.png' },
  { size: 40, scale: 2, filename: 'App-Icon-40x40@2x.png' },
  { size: 40, scale: 3, filename: 'App-Icon-40x40@3x.png' },
  { size: 60, scale: 2, filename: 'App-Icon-60x60@2x.png' },
  { size: 60, scale: 3, filename: 'App-Icon-60x60@3x.png' },
  { size: 76, scale: 1, filename: 'App-Icon-76x76@1x.png' },
  { size: 76, scale: 2, filename: 'App-Icon-76x76@2x.png' },
  { size: 83.5, scale: 2, filename: 'App-Icon-83.5x83.5@2x.png' },
  { size: 1024, scale: 1, filename: 'ItunesArtwork@2x.png' },
];

// Android mipmap densities (size in dp, actual pixel size)
const ANDROID_ICONS = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generateIcons() {
  console.log('🎨 Generating app icons from:', ICON_SOURCE);
  console.log('');

  // Check if source icon exists
  if (!fs.existsSync(ICON_SOURCE)) {
    console.error('❌ Source icon not found!');
    console.error('   Please place your 1024x1024 JPG Subreminder logo at:');
    console.error('   ', ICON_SOURCE);
    process.exit(1);
  }

  // Ensure directories exist
  if (!fs.existsSync(IOS_ICON_DIR)) {
    fs.mkdirSync(IOS_ICON_DIR, { recursive: true });
  }

  // Generate iOS icons with more padding (65% of canvas to show full image with text)
  console.log('📱 Generating iOS icons...');
  for (const icon of IOS_ICONS) {
    const outputSize = Math.round(icon.size * icon.scale);
    const iconSize = Math.round(outputSize * 0.65); // 65% of canvas for more padding
    const outputPath = path.join(IOS_ICON_DIR, icon.filename);
    
    try {
      await sharp(ICON_SOURCE)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .extend({
          top: Math.round((outputSize - iconSize) / 2),
          bottom: Math.round((outputSize - iconSize) / 2),
          left: Math.round((outputSize - iconSize) / 2),
          right: Math.round((outputSize - iconSize) / 2),
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White padding
        })
        .png()
        .toFile(outputPath);
      
      console.log(`   ✓ ${icon.filename} (${outputSize}x${outputSize}, icon: ${iconSize}x${iconSize})`);
    } catch (error) {
      console.error(`   ✗ Failed ${icon.filename}:`, error.message);
    }
  }

  // Generate Android foreground icons with more padding (55% of canvas for adaptive icons)
  // Android adaptive icons need padding to show full image with text properly
  console.log('\n🤖 Generating Android icons...');
  for (const [mipmapDir, size] of Object.entries(ANDROID_ICONS)) {
    const mipmapPath = path.join(ANDROID_RES_DIR, mipmapDir);
    if (!fs.existsSync(mipmapPath)) {
      fs.mkdirSync(mipmapPath, { recursive: true });
    }

    const foregroundPath = path.join(mipmapPath, 'ic_launcher_foreground.webp');
    const iconSize = Math.round(size * 0.55); // 55% for more padding to show text properly
    const padding = Math.round((size - iconSize) / 2);
    
    try {
      await sharp(ICON_SOURCE)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent padding
        })
        .webp({ quality: 100, effort: 6 })
        .toFile(foregroundPath);
      
      console.log(`   ✓ ${mipmapDir}/ic_launcher_foreground.webp (${size}x${size}, icon: ${iconSize}x${iconSize})`);
    } catch (error) {
      console.error(`   ✗ Failed ${mipmapDir}:`, error.message);
    }
  }

  console.log('\n✅ All icons generated successfully!');
  console.log('\n📋 Next steps:');
  console.log('   1. Rebuild your app:');
  console.log('      - Android: npx expo run:android');
  console.log('      - iOS: npx expo run:ios');
  console.log('   2. For Android: Uninstall the old app first to see the new icon');
  console.log('   3. For iOS: Clean build folder in Xcode (Cmd+Shift+K)');
}

generateIcons().catch(error => {
  console.error('❌ Error generating icons:', error);
  process.exit(1);
});

