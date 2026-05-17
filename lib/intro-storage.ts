import AsyncStorage from "@react-native-async-storage/async-storage";

const INTRO_SEEN_KEY = "@begifted/intro_seen";

export async function hasSeenIntro(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(INTRO_SEEN_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function markIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, "true");
  } catch {
    // Silently fail — worst case the user sees the intro again on next launch.
  }
}
