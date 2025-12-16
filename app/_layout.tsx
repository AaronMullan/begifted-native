import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import Header from "../components/Header";
import { useFontsLoader } from "../hooks/use-fonts-loader";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load fonts and handle splash screen
  const fontsLoaded = useFontsLoader();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider theme={MD3LightTheme}>
      <Stack
        screenOptions={{
          header: () => <Header />,
        }}
      />
    </PaperProvider>
  );
}
