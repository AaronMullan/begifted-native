/**
 * In-app notifications + device push tokens API.
 */

import { supabase } from "../supabase";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  created_at: string;
}

/**
 * Fetch notifications for a user (most recent 50)
 */
export async function fetchNotifications(
  userId: string
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("app_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

/**
 * Fetch unread notification count for a user
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("app_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw error;
  return count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from("app_notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("app_notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw error;
}

/**
 * Store (or refresh) this device's Expo push token, keyed on the token so a
 * device switching accounts re-homes its token.
 */
export async function upsertPushToken(input: {
  user_id: string;
  token: string;
  platform: "ios" | "android";
}): Promise<void> {
  const { error } = await supabase.from("user_push_tokens").upsert(
    {
      ...input,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );

  if (error) throw error;
}

/**
 * Delete a device push token (called on sign-out).
 */
export async function deletePushToken(token: string): Promise<void> {
  const { error } = await supabase
    .from("user_push_tokens")
    .delete()
    .eq("token", token);

  if (error) throw error;
}
