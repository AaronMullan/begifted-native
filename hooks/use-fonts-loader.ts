import {
  useFonts,
  RobotoFlex_400Regular,
} from "@expo-google-fonts/roboto-flex";
import { AzeretMono_400Regular } from "@expo-google-fonts/azeret-mono";
import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_600SemiBold,
} from "@expo-google-fonts/fraunces";

/**
 * Hook to load custom fonts.
 * Returns true when fonts are loaded and ready to use.
 */
export function useFontsLoader() {
  const [fontsLoaded] = useFonts({
    RobotoFlex_400Regular,
    AzeretMono_400Regular,
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
  });

  return fontsLoaded;
}
