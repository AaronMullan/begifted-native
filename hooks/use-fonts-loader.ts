import { useEffect, useRef } from "react";
import {
  useFonts,
  RobotoFlex_400Regular,
} from "@expo-google-fonts/roboto-flex";
import { AzeretMono_400Regular } from "@expo-google-fonts/azeret-mono";
import * as SplashScreen from "expo-splash-screen";

/**
 * Hook to load custom fonts and coordinate splash screen hiding.
 * Returns true when fonts are loaded and ready to use.
 */
export function useFontsLoader() {
  const [fontsLoaded] = useFonts({
    RobotoFlex_400Regular,
    AzeretMono_400Regular,
  });
  const startTimeRef = useRef<number>(Date.now());
  const hideCalledRef = useRef<boolean>(false);

  useEffect(() => {
    if (fontsLoaded && !hideCalledRef.current) {
      hideCalledRef.current = true;
      const elapsed = Date.now() - startTimeRef.current;
      const minDuration = 1000; // Minimum 1 second
      const remainingTime = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {
          // Ignore errors if splash screen is already hidden
        });
      }, remainingTime);
    }
  }, [fontsLoaded]);

  return fontsLoaded;
}
