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
import {
  PoltawskiNowy_400Regular,
  PoltawskiNowy_500Medium,
  PoltawskiNowy_600SemiBold,
  PoltawskiNowy_700Bold,
} from "@expo-google-fonts/poltawski-nowy";
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from "@expo-google-fonts/dm-sans";

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
    PoltawskiNowy_400Regular,
    PoltawskiNowy_500Medium,
    PoltawskiNowy_600SemiBold,
    PoltawskiNowy_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  return fontsLoaded;
}
