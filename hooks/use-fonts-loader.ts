import { useEffect } from "react";
import {
  useFonts,
  RobotoFlex_400Regular,
} from "@expo-google-fonts/roboto-flex";
import { AzeretMono_400Regular } from "@expo-google-fonts/azeret-mono";
import * as SplashScreen from "expo-splash-screen";

/**
 * Hook to load custom fonts and manage splash screen visibility.
 * Returns true when fonts are loaded and ready to use.
 */
export function useFontsLoader() {
  const [fontsLoaded] = useFonts({
    RobotoFlex_400Regular,
    AzeretMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  return fontsLoaded;
}
