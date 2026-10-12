import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const PENDING_KEY = "begifted-pending-legal-acceptance";

function deviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

/**
 * Record the user's Terms/Privacy acceptance through the
 * record-legal-acceptance edge function, which stamps accepted_at and
 * ip_address server-side so the paper trail can't be forged client-side.
 * Requires an authenticated session (the function verifies the JWT).
 * Failures are reported to Sentry, never surfaced to the user — acceptance
 * recording must not block signup.
 */
export async function recordLegalAcceptance(
  acceptanceMethod: string
): Promise<boolean> {
  try {
    const { data: versions, error } = await supabase
      .from("legal_document_versions")
      .select("id, document_type")
      .eq("is_active", true);
    if (error) throw error;

    const terms = versions?.find((v) => v.document_type === "terms");
    const privacy = versions?.find((v) => v.document_type === "privacy_policy");
    if (!terms || !privacy) {
      throw new Error("Active legal document versions not found");
    }

    const { error: fnError } = await supabase.functions.invoke(
      "record-legal-acceptance",
      {
        body: {
          terms_version_id: terms.id,
          privacy_policy_version_id: privacy.id,
          acceptance_method: acceptanceMethod,
          app_version: Constants.expoConfig?.version,
          platform: Platform.OS,
          os_version: Device.osVersion ?? undefined,
          device_model: Device.modelName ?? undefined,
          locale: deviceLocale(),
        },
      }
    );
    if (fnError) throw fnError;
    return true;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "legal-acceptance" },
    });
    return false;
  }
}

/**
 * Signup with email verification returns no session, so the acceptance can't
 * be recorded at checkbox time (the edge function needs the user's JWT).
 * Stash a marker; the first authenticated load flushes it. Pass `userId` when
 * a session already exists, so the marker can't be recorded against whichever
 * account signs in next on this device.
 */
export async function markPendingLegalAcceptance(
  acceptanceMethod = "signup_checkbox",
  userId?: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PENDING_KEY,
      userId
        ? JSON.stringify({ method: acceptanceMethod, userId })
        : acceptanceMethod
    );
  } catch {
    // Best-effort: worst case this user's acceptance goes unrecorded.
  }
}

function parsePendingMarker(raw: string): { method: string; userId?: string } {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.method === "string") return parsed;
  } catch {
    // A bare method string from the pre-session signup path.
  }
  return { method: raw };
}

export async function flushPendingLegalAcceptance(
  userId: string
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return;
    const marker = parsePendingMarker(raw);
    if (marker.userId && marker.userId !== userId) return;
    const recorded = await recordLegalAcceptance(marker.method);
    if (recorded) {
      await AsyncStorage.removeItem(PENDING_KEY);
    }
  } catch {
    // Marker stays; retried on the next authenticated load.
  }
}
