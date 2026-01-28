import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import { View, StyleSheet } from "react-native";
import Header from "../components/Header";
import GradientBackground from "../components/GradientBackground";
import { useFontsLoader } from "../hooks/use-fonts-loader";
import { defaultQueryOptions } from "../lib/query-defaults";

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

function HeaderWrapper() {
  // Index route is now the app entry point, not marketing site
  // Keep colorful mode disabled for index route
  return <Header colorful={false} />;
}

export default function RootLayout() {
  // Load fonts and handle splash screen
  const fontsLoaded = useFontsLoader();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={customTheme}>
        <View style={styles.container}>
          <GradientBackground />
          <Stack
            screenOptions={{
              header: () => <HeaderWrapper />,
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
        </View>
      </PaperProvider>
    </QueryClientProvider>
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
