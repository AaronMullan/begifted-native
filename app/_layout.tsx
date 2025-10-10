import { Stack } from "expo-router";
import {
  useFonts,
  RobotoFlex_400Regular,
} from "@expo-google-fonts/roboto-flex";
import { AzeretMono_400Regular } from "@expo-google-fonts/azeret-mono";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import Header from "../components/Header";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    RobotoFlex_400Regular,
    AzeretMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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
