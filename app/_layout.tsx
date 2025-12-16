import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import Header from "../components/Header";
import { useFontsLoader } from "../hooks/use-fonts-loader";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Custom theme with reduced border radius for buttons
const customTheme = {
  ...MD3LightTheme,
  roundness: 2, // Reduced from default (typically 8 or 12) to make buttons less rounded
};

export default function RootLayout() {
  // Load fonts and handle splash screen
  const fontsLoaded = useFontsLoader();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider theme={customTheme}>
      <Stack
        screenOptions={{
          header: () => <Header />,
        }}
      />
    </PaperProvider>
  );
}
