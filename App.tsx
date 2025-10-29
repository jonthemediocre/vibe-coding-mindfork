import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import { ThemeProvider } from "./src/app-components/components/ThemeProvider";
import { ErrorBoundary } from "./src/app-components/components/ErrorBoundary";
import { AuthProvider } from "./src/contexts/AuthContext";
import { View } from "react-native";
import "./global.css";

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <View testID="app-ready" style={{ flex: 1 }}>
                <AuthNavigator />
              </View>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;
