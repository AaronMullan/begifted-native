import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { deletePushToken, upsertPushToken } from "./api";

/**
 * True when requesting push permission would surface the OS dialog: real
 * device, not yet granted, and the OS still allows asking. Callers show the
 * in-app explainer first in exactly this case; when permission is already
 * granted (register silently) or permanently denied (request no-ops), the
 * explainer would be noise.
 */
export async function needsPushPermissionPrompt(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return status !== "granted" && canAskAgain;
}

/**
 * Register for push notifications and store the token in Supabase.
 * No-ops on simulators. Logs errors but never throws.
 */
export async function registerForPushNotifications(
  userId: string
): Promise<void> {
  if (!Device.isDevice) {
    console.log("[push] Skipping push registration on simulator");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
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

  try {
    await upsertPushToken({ user_id: userId, token: tokenData, platform });
    console.log("[push] Push token registered:", tokenData);
  } catch (error) {
    console.error("[push] Failed to store push token:", error);
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

    await deletePushToken(tokenData);
    console.log("[push] Push token unregistered");
  } catch (error) {
    console.error("[push] Error during token unregistration:", error);
  }
}
