module.exports = {
  expo: {
    name: "Subscription Reminder",
    slug: "subscriptionreminder",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
      imageResizeMode: "contain"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.subscriptionreminder",
      buildNumber: "1.0.0",
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to scan QR codes",
        NSPhotoLibraryUsageDescription: "This app uses the photo library to select images",
        NSPhotoLibraryAddUsageDescription: "This app uses the photo library to save images"
      }
    },
    android: {
      icon: "./assets/images/icon.png",
      package: "com.yourcompany.subscriptionreminder",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED"
      ],
      splash: {
        backgroundColor: "#ffffff",
        resizeMode: "contain",
        image: "./assets/images/icon.png"
      }
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-font",
      "expo-secure-store",
      [
        "expo-router",
        {
          origin: "https://yourapp.com"
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#ffffff"
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      resendApiKey: process.env.EXPO_PUBLIC_RESEND_API_KEY,
      fromEmail: process.env.EXPO_PUBLIC_FROM_EMAIL || 'noreply@subscriptionreminder.app',
      eas: {
        projectId: "a6b04bbf-baa0-4b2e-9abd-1beb06b3609e"
      }
    },
    owner: "shah2077",
    projectId: "a6b04bbf-baa0-4b2e-9abd-1beb06b3609e",
    runtimeVersion: {
      policy: "sdkVersion"
    }
  }
};