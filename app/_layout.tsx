import React, { useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { QueryCache, MutationCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  Provider as PaperProvider,
  MD3LightTheme,
  Text,
  Button,
} from "react-native-paper";
import { View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Header from "../components/Header";
import AnimatedSplash from "../components/AnimatedSplash";
import BottomNav from "../components/BottomNav";
import GiftActionDrawerProvider from "../components/gifts/GiftActionDrawerProvider";
import { Colors } from "../lib/colors";
import { useFontsLoader } from "../hooks/use-fonts-loader";
import { usePushNotifications } from "../hooks/use-push-notifications";
import { defaultQueryOptions } from "../lib/query-defaults";
import { persistOptions } from "../lib/query-persister";
import { captureMutationError, captureQueryError } from "../lib/sentry-helpers";
import { openBugReport } from "../lib/feedback";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN && !__DEV__,
  environment: __DEV__ ? "development" : "production",
  sendDefaultPii: true,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    // Beta bug-report widget (DEV-96). Friendly copy for non-technical
    // testers; lets them attach a screenshot and prefills name/email from the
    // signed-in Sentry user so there's one less thing to type.
    Sentry.feedbackIntegration({
      formTitle: "Report a Bug",
      messageLabel: "What happened?",
      messagePlaceholder:
        "Tell us what you were doing and what went wrong. The more detail, the faster we can fix it.",
      submitButtonLabel: "Send report",
      successMessageText: "Thanks! Your report is on its way to the team.",
      enableScreenshot: true,
      showName: true,
      showEmail: true,
      isNameRequired: false,
      isEmailRequired: false,
    }),
  ],
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught render error:", error);
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text variant="titleMedium">Something went wrong.</Text>
          <Text variant="bodyMedium" style={styles.errorBody}>
            Please restart the app.
          </Text>
          <Button
            mode="contained"
            icon="bug"
            style={styles.errorReportButton}
            onPress={() => openBugReport("crash")}
          >
            Tell us what happened
          </Button>
        </View>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      captureQueryError(error, query.queryKey);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      captureMutationError(error, mutation.options.mutationKey);
    },
  }),
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// MD3 theme wired to the Figma brand palette (see lib/colors.ts → Colors.brand).
// Components that need a non-brand primary (e.g. legacy "#000000" CTAs) still
// pass buttonColor explicitly and continue to override this default.
const customTheme = {
  ...MD3LightTheme,
  roundness: 18,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.brand.buttonTeal,
    secondary: Colors.brand.mediumTeal,
    background: Colors.white,
    surface: Colors.white,
    surfaceVariant: "#F5F5F5",
    error: MD3LightTheme.colors.error,
    onPrimary: Colors.white,
    onSecondary: Colors.white,
    onBackground: Colors.brand.darkTeal,
    onSurface: Colors.brand.darkTeal,
    onError: Colors.white,
    outline: Colors.brand.darkTeal,
  },
};

function AppShell() {
  // Set up push notification registration, handlers, and deep linking
  usePushNotifications();

  return (
    <View style={styles.container}>
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

export default Sentry.wrap(function RootLayout() {
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
    <GestureHandlerRootView style={styles.root}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
      >
        <PaperProvider theme={customTheme}>
          <ErrorBoundary>
            <GiftActionDrawerProvider>
              <AppShell />
            </GiftActionDrawerProvider>
          </ErrorBoundary>
          {!splashDone && (
            <AnimatedSplash
              ready={splashReady}
              onFinish={() => setSplashDone(true)}
            />
          )}
        </PaperProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    overflow: "hidden",
    left: 0,
    right: 0,
    width: "100%",
    backgroundColor: Colors.neutrals.dark,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorBody: {
    marginTop: 8,
    color: "#666",
  },
  errorReportButton: {
    marginTop: 24,
  },
});
