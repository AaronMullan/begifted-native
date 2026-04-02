import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "./supabase";

/**
 * Register for push notifications and store the token in Supabase.
 * No-ops on simulators. Logs errors but never throws.
 */
export async function registerForPushNotifications(
  userId: string,
): Promise<void> {
  if (!Device.isDevice) {
    console.log("[push] Skipping push registration on simulator");
    return;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[push] Push notification permission not granted");
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.error("[push] Missing EAS projectId in app config");
    return;
  }

  const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  const platform = Platform.OS as "ios" | "android";

  const { error } = await supabase.from("user_push_tokens").upsert(
    {
      user_id: userId,
      token: tokenData,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );

  if (error) {
    console.error("[push] Failed to store push token:", error);
  } else {
    console.log("[push] Push token registered:", tokenData);
  }
}

/**
 * Remove the current device's push token from Supabase.
 * Call on sign-out to stop receiving notifications.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!Device.isDevice) {
    return;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const { error } = await supabase
      .from("user_push_tokens")
      .delete()
      .eq("token", tokenData);

    if (error) {
      console.error("[push] Failed to delete push token:", error);
    } else {
      console.log("[push] Push token unregistered");
    }
  } catch (error) {
    console.error("[push] Error during token unregistration:", error);
  }
}
