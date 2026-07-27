import * as FileSystem from "expo-file-system/legacy";
import * as Sentry from "@sentry/react-native";
import { invokeWithRetry } from "./edge-retry";

// Direct supabase.storage.upload calls to `recipient-photos` get RLS-rejected
// on this project even with permissive policies — likely a storage-api/plpgsql
// plan cache issue we cannot fix from the client. Route through an edge
// function (`upload-recipient-photo`) that uses service_role to do the upload,
// while enforcing path scoping to the authenticated caller's user_id.
export async function uploadRecipientPhoto(
  photoUri: string
): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Cap at 2 attempts (one retry): a transient FetchError / 5xx gets a single
    // jittered re-send, but the base64 image payload is large and the failing
    // device is often thermally throttling with a saturated uplink — so we
    // avoid the default 3-attempt hammering. Still falls back to null (DEV-177).
    const { data, error } = await invokeWithRetry<{
      publicUrl?: string;
      error?: string;
    }>(
      "upload-recipient-photo",
      {
        body: { base64, contentType: "image/jpeg" },
      },
      2
    );
    if (error || !data?.publicUrl) {
      const message = error?.message ?? data?.error ?? "Upload failed";
      console.error("[photo] upload error:", message);
      Sentry.captureException(new Error(message), {
        tags: { flow: "recipient_photo", step: "photo_upload" },
      });
      return null;
    }
    return data.publicUrl;
  } catch (err) {
    console.error("[photo] upload failed:", err);
    Sentry.captureException(err, {
      tags: { flow: "recipient_photo", step: "photo_upload" },
    });
    return null;
  }
}
