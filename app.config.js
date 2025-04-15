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
      bundleIdentifier: "com.subscriptionreminder"
    },
    android: {
      icon: "./assets/images/icon.png",
      package: "com.subscriptionreminder",
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
      ]
    ],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
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