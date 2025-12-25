#!/usr/bin/env node

/**
 * Update iOS splash screen logo files
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SPLASH_SOURCE = path.join(__dirname, '../assets/images/icon.jpg');
const IOS_SPLASH_DIR = path.join(__dirname, '../ios/SubscriptionReminder/Images.xcassets/SplashScreenLogo.imageset');

const IOS_SPLASH_SIZES = [
  { scale: 1, filename: 'image.png', size: 414 }, // iPhone standard width
  { scale: 2, filename: 'image@2x.png', size: 828 }, // iPhone Retina width
  { scale: 3, filename: 'image@3x.png', size: 1242 }, // iPhone Plus/Pro Max width
];

async function updateIOSSplash() {
  console.log('🖼️  Updating iOS splash screen logos from:', SPLASH_SOURCE);
  console.log('');

  if (!fs.existsSync(SPLASH_SOURCE)) {
    console.error('❌ Splash screen logo not found!');
    console.error('   Please ensure:', SPLASH_SOURCE, 'exists');
    process.exit(1);
  }

  if (!fs.existsSync(IOS_SPLASH_DIR)) {
    fs.mkdirSync(IOS_SPLASH_DIR, { recursive: true });
  }

  console.log('📱 Updating iOS splash screen logos...');
  for (const splash of IOS_SPLASH_SIZES) {
    const outputPath = path.join(IOS_SPLASH_DIR, splash.filename);
    // Use 70% of canvas size to add padding and prevent cutting
    const logoSize = Math.round(splash.size * 0.7);
    const padding = Math.round((splash.size - logoSize) / 2);
    
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
        .toFile(outputPath);
      
      console.log(`   ✓ ${splash.filename} (${splash.size}x${splash.size}, logo: ${logoSize}x${logoSize})`);
    } catch (error) {
      console.error(`   ✗ Failed ${splash.filename}:`, error.message);
    }
  }

  console.log('\n✅ iOS splash screen logos updated successfully!');
}

updateIOSSplash().catch(error => {
  console.error('❌ Error updating iOS splash screen:', error);
  process.exit(1);
});

