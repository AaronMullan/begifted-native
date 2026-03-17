import { useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import { View, StyleSheet } from "react-native";
import Header from "../components/Header";
import GradientBackground from "../components/GradientBackground";
import AnimatedSplash from "../components/AnimatedSplash";
import BottomNav from "../components/BottomNav";
import { useFontsLoader } from "../hooks/use-fonts-loader";
import { usePushNotifications } from "../hooks/use-push-notifications";
import { defaultQueryOptions } from "../lib/query-defaults";
import { persistOptions } from "../lib/query-persister";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
  },
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Custom theme with 18px border radius for buttons and color scheme
const customTheme = {
  ...MD3LightTheme,
  roundness: 18, // 18px rounded corners for buttons and other components
  colors: {
    ...MD3LightTheme.colors,
    primary: "#000000", // Black for primary actions
    secondary: "#666666", // Gray for secondary elements
    background: "#FFFFFF", // White background
    surface: "#FFFFFF", // White surface
    surfaceVariant: "#F5F5F5", // Light gray for surface variants
    error: MD3LightTheme.colors.error, // Keep red for errors
    onPrimary: "#FFFFFF", // White text on primary (black)
    onSecondary: "#FFFFFF", // White text on secondary
    onBackground: "#000000", // Black text on background
    onSurface: "#000000", // Black text on surface
    onError: "#FFFFFF", // White text on error
    outline: "#000000", // Black border for outlined buttons
  },
};

function AppShell() {
  // Set up push notification registration, handlers, and deep linking
  usePushNotifications();

  return (
    <View style={styles.container}>
      <GradientBackground />
      <Header colorful={false} />
      <Stack
        screenOptions={{
          // Disable stack-level fade/slide animations; let screens animate their own content
          animation: "none",
          headerShown: false,
          headerTransparent: true,
          headerStyle: {
            backgroundColor: "transparent",
          },
          contentStyle: {
            backgroundColor: "transparent",
          },
          gestureEnabled: false,
        }}
      />
      <BottomNav />
    </View>
  );
}

export default function RootLayout() {
  const fontsLoaded = useFontsLoader();
  const [splashReady, setSplashReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  if (fontsLoaded && !splashReady) {
    SplashScreen.hideAsync().catch(() => {});
    setSplashReady(true);
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <PaperProvider theme={customTheme}>
        <AppShell />
        {!splashDone && (
          <AnimatedSplash
            ready={splashReady}
            onFinish={() => setSplashDone(true)}
          />
        )}
      </PaperProvider>
    </PersistQueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    left: 0,
    right: 0,
    width: "100%",
  },
});
