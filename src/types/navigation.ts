import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Food Stack Types
export type FoodStackParamList = {
  FoodMain: undefined;
  FoodEntryConfirm: {
    foodData: {
      name: string;
      calories: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      servingSize?: string;
    };
  };
};

// Coach Stack Types
export type CoachStackParamList = {
  CoachMain: undefined;
  CoachCall: { coachId: string };
  CoachSMS: { coachId: string };
};

// Tab Navigator Types
export type TabParamList = {
  Home: undefined;
  Food: NavigatorScreenParams<FoodStackParamList>;
  Fasting: undefined;
  Social: undefined;
  Coach: NavigatorScreenParams<CoachStackParamList>;
};

// Root Stack Types (includes tabs + hidden screens)
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Goals: undefined;
  Marketplace: undefined;
  Settings: undefined;
};

// Declare global navigation types for type-safe navigation throughout app
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// Helper types for screens
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> =
  BottomTabScreenProps<TabParamList, T>;

export type FoodStackScreenProps<T extends keyof FoodStackParamList> =
  NativeStackScreenProps<FoodStackParamList, T>;

export type CoachStackScreenProps<T extends keyof CoachStackParamList> =
  NativeStackScreenProps<CoachStackParamList, T>;
