module.exports = {
  expo: {
    name: "Subscription Reminder",
    slug: "subscription-reminder",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.subscriptionreminder"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.yourcompany.subscriptionreminder"
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/favicon.png"
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
        projectId: "your-project-id"
      }
    }
  }
};