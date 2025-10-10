import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Header from "../components/Header";
import { useAuthDeepLink } from "../hooks/use-auth-deep-link";
import { useFontsLoader } from "../hooks/use-fonts-loader";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load fonts and handle splash screen
  const fontsLoaded = useFontsLoader();
  // Handle magic link authentication
  useAuthDeepLink();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        header: () => <Header />,
      }}
    />
  );
}
