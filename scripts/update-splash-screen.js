#!/usr/bin/env node

/**
 * Update splash screen logo files for Android
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SPLASH_SOURCE = path.join(__dirname, '../assets/images/icon.jpg');
const ANDROID_RES_DIR = path.join(__dirname, '../android/app/src/main/res');

// Android drawable densities (larger sizes for splash screen)
const ANDROID_DRAWABLES = {
  'drawable-mdpi': 320,
  'drawable-hdpi': 480,
  'drawable-xhdpi': 720,
  'drawable-xxhdpi': 1080,
  'drawable-xxxhdpi': 1440,
};

async function updateSplashScreen() {
  console.log('🖼️  Updating splash screen logos from:', SPLASH_SOURCE);
  console.log('');

  if (!fs.existsSync(SPLASH_SOURCE)) {
    console.error('❌ Splash screen logo not found!');
    console.error('   Please ensure:', SPLASH_SOURCE, 'exists');
    process.exit(1);
  }

  console.log('🤖 Updating Android splash screen logos...');
  for (const [drawableDir, size] of Object.entries(ANDROID_DRAWABLES)) {
    const drawablePath = path.join(ANDROID_RES_DIR, drawableDir);
    if (!fs.existsSync(drawablePath)) {
      fs.mkdirSync(drawablePath, { recursive: true });
    }

    const splashPath = path.join(drawablePath, 'splashscreen_logo.png');
    // Use 70% of canvas size to add padding and prevent cutting
    const logoSize = Math.round(size * 0.7);
    const padding = Math.round((size - logoSize) / 2);
    
    try {
      await sharp(SPLASH_SOURCE)
        .resize(logoSize, logoSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White padding
        })
        .png()
        .toFile(splashPath);
      
      console.log(`   ✓ ${drawableDir}/splashscreen_logo.png (${size}x${size}, logo: ${logoSize}x${logoSize})`);
    } catch (error) {
      console.error(`   ✗ Failed ${drawableDir}:`, error.message);
    }
  }

  console.log('\n✅ Splash screen logos updated successfully!');
}

updateSplashScreen().catch(error => {
  console.error('❌ Error updating splash screen:', error);
  process.exit(1);
});

