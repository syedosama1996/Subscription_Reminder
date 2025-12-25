# App Icon Setup Guide for Subreminder

## Current Status
✅ App configuration is set up correctly in `app.config.js`
✅ Icon paths are configured for both iOS and Android
✅ Scripts are ready to generate all icon sizes

## What You Need to Do

### Step 1: Prepare Your Subreminder Logo
- **Format**: PNG with transparency (if needed)
- **Size**: 1024x1024 pixels (square)
- **Background**: White or transparent
- **Content**: Your Subreminder logo with the clock/timer icon replacing the 'e'

### Step 2: Replace the Current Icon
1. Save your Subreminder logo as: `assets/images/icon.png`
2. This will replace the current concentric circles icon

### Step 3: Generate All Icon Sizes
Run the following command to generate all required icon sizes for iOS and Android:

```bash
npx expo prebuild --clean
```

This will:
- Generate all iOS icon sizes (20x20 to 1024x1024)
- Generate all Android icon sizes (mdpi to xxxhdpi)
- Create adaptive icons for Android
- Update all native project files

### Step 4: Verify Icons
After running prebuild, check:
- **iOS**: `ios/SubscriptionReminder/Images.xcassets/AppIcon.appiconset/` should have all icon sizes
- **Android**: `android/app/src/main/res/mipmap-*/` should have all launcher icons

### Step 5: Build Your App
Once icons are generated, you can build your app:
- **iOS**: `npx expo run:ios` or build via Xcode
- **Android**: `npx expo run:android` or build via Android Studio

## Current Configuration

The `app.config.js` is configured to use:
- Main icon: `./assets/images/icon.png`
- iOS: Uses the same icon (auto-generated sizes)
- Android: Uses the same icon with white background for adaptive icon
- Splash screen: Also uses the same icon

## Troubleshooting

If icons don't appear after prebuild:
1. Ensure your source icon is exactly 1024x1024 pixels
2. Check that the file is a valid PNG
3. Try running `npx expo prebuild --clean` again
4. For iOS, you may need to open Xcode and verify the AppIcon asset catalog

## Notes
- The CocoaPods encoding warning is harmless and doesn't affect icon generation
- Icons are generated automatically by Expo during prebuild
- You only need to provide the 1024x1024 source image - Expo handles the rest

