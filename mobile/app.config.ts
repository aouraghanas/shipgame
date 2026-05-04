import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Expo config for the Shipeh mobile app.
 *
 * The API base URL is read from `EXPO_PUBLIC_API_BASE_URL` at build/runtime
 * so dev devices can point at localhost:3000 and production builds can point
 * at the deployed Next.js site without code changes.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Shipeh",
  slug: "shipeh-mobile",
  scheme: "shipeh",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  splash: {
    backgroundColor: "#0a0a0a",
    resizeMode: "contain",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.shipeh.mobile",
    infoPlist: {
      NSFaceIDUsageDescription:
        "Use Face ID to sign in to Shipeh quickly and securely.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.shipeh.mobile",
    adaptiveIcon: {
      backgroundColor: "#a31d2a",
    },
    softwareKeyboardLayoutMode: "pan",
  },
  web: {
    bundler: "metro",
    output: "static",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-localization",
    [
      "expo-local-authentication",
      {
        faceIDPermission: "Use Face ID to sign in to Shipeh.",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#a31d2a",
      },
    ],
  ],
  extra: {
    apiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000",
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? undefined,
    },
  },
  experiments: {
    typedRoutes: true,
  },
});
