/**
 * @format
 */

// Ensure NODE_ENV is set for runtime checks
if (!process.env.NODE_ENV) {
  // __DEV__ is provided by React Native
  process.env.NODE_ENV = __DEV__ ? "development" : "production";
}

// Reanimated should be imported at the top of the entry file
import "react-native-reanimated";
import "text-encoding-polyfill";

import { AppRegistry } from "react-native";
import { registerRootComponent } from "expo";
import App from "./App";

const appName = "MindFork";

// Silence verbose logs in production to reduce noise and overhead
if (!__DEV__) {
  const noop = () => {};
  // Keep warnings and errors, silence info/debug
  // Some libraries use console.debug heavily which can hurt perf
  // eslint-disable-next-line no-console
  console.log = noop;
  // eslint-disable-next-line no-console
  console.debug = noop;
}

// Register the root component for both Expo Go and native builds
registerRootComponent(App);
// Also register explicit names for extra compatibility
AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent("main", () => App);
