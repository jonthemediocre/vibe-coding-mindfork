import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MindFork',
  slug: 'mindfork',
  version: '1.0.0',
  owner: 'jonthemediocre',
  platforms: ['android', 'ios'],
  scheme: 'mindfork',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.mindfork.app',
    buildNumber: '1',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    requireFullScreen: false,
    userInterfaceStyle: 'automatic',
    config: {
      usesNonExemptEncryption: false,
    },
    associatedDomains: ['applinks:mindfork.app'],
    infoPlist: {
      NSCameraUsageDescription: 'MindFork uses the camera to scan food items and track nutrition information.',
      NSLocationWhenInUseUsageDescription: 'MindFork uses location to find nearby restaurants and food options.',
      NSPhotoLibraryUsageDescription: 'MindFork needs access to your photo library to save meal photos and nutrition logs.',
      NSMicrophoneUsageDescription: 'MindFork uses the microphone for voice-activated food logging.',
      NSFaceIDUsageDescription: 'MindFork uses Face ID for secure authentication and data protection.',
      ITSAppUsesNonExemptEncryption: false,
      CFBundleAllowMixedLocalizations: true,
      UIRequiresFullScreen: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#FFFFFF',
    },
    package: 'com.mindfork.app',
    versionCode: 1,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.VIBRATE',
      'android.permission.POST_NOTIFICATIONS',
    ],
    blockedPermissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.mindfork.app',
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission: 'Allow MindFork to access your camera to scan food items and track nutrition.',
        microphonePermission: 'Allow MindFork to access your microphone for voice-activated food logging.',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow MindFork to use your location to find nearby restaurants and food options.',
      },
    ],
    'expo-notifications',
    [
      'expo-build-properties',
      {
        android: {
          enableProguardInReleaseBuilds: false,
          enableShrinkResourcesInReleaseBuilds: false,
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          buildToolsVersion: '34.0.0',
        },
      },
    ],
  ],
  runtimeVersion: '1.0.0',
  updates: {
    fallbackToCacheTimeout: 0,
    url: 'https://u.expo.dev/44f9f71e-4731-4593-a6c4-c30907ae3db1',
  },
  extra: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID: process.env.EXPO_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    EXPO_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID: process.env.EXPO_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID,
  },
  privacy: 'public',
});
