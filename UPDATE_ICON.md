# How to Update the App Icon

## Current Status
✅ All icon generation scripts are set up
✅ iOS and Android icon configurations are ready
⚠️ **You need to replace the source icon file with your Subreminder logo**

## Quick Steps to Update Icon

### 1. Replace the Source Icon
Replace `assets/images/icon.png` with your Subreminder logo:
- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Content**: Your Subreminder logo with the clock/timer icon

### 2. Generate All Icon Sizes
Run this command to generate all required icon sizes:

```bash
npm run generate-icons
```

Or directly:
```bash
node scripts/generate-icons-sharp.js
```

This will create:
- ✅ All iOS icon sizes (20x20 to 1024x1024)
- ✅ All Android icon sizes (mdpi to xxxhdpi)
- ✅ Adaptive icon foregrounds for Android

### 3. Rebuild Your App

**For Android:**
```bash
# Uninstall the old app first (important!)
adb uninstall com.yourcompany.subscriptionreminder

# Then rebuild and install
npx expo run:android
```

**For iOS:**
```bash
# Clean build folder in Xcode first (Cmd+Shift+K)
# Then rebuild
npx expo run:ios
```

Or build via Xcode/Android Studio after cleaning the build.

## Important Notes

1. **Uninstall Old App**: Android caches app icons. You MUST uninstall the old app before installing the new one to see the updated icon.

2. **Clean Build**: For iOS, clean the build folder in Xcode (Product → Clean Build Folder or Cmd+Shift+K) to ensure new icons are used.

3. **Source Icon**: The script reads from `assets/images/icon.png`. Make sure this file is your Subreminder logo (1024x1024 PNG) before running the generation script.

4. **After Icon Update**: Once you replace the icon and regenerate, the new icon will appear after rebuilding and reinstalling the app.

## Verification

After rebuilding, check:
- **Android**: The app icon on your device/emulator should show your Subreminder logo
- **iOS**: The app icon in the simulator/device should show your Subreminder logo

If the icon doesn't update:
1. Verify `assets/images/icon.png` is your Subreminder logo
2. Run `npm run generate-icons` again
3. Uninstall the old app completely
4. Rebuild and reinstall

