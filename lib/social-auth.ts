import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as Sentry from "@sentry/react-native";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { fillProfileNameIfMissing } from "./signup-name";
import { recordLegalAcceptance } from "./legal-acceptance";

// OAuth client IDs are public identifiers, not secrets. Supabase verifies
// Google ID tokens against the web client ID, so the native SDK must request
// tokens for that audience; the iOS client ID drives the native sheet and must
// match the `iosUrlScheme` in app.json.
const GOOGLE_WEB_CLIENT_ID = "REPLACE_WITH_WEB_CLIENT_ID";
const GOOGLE_IOS_CLIENT_ID = "REPLACE_WITH_IOS_CLIENT_ID";

export type SocialProvider = "apple" | "google";

export type SocialSignInResult =
  { ok: true } | { cancelled: true } | { error: string };

export type SocialAcceptanceMethod =
  "signup_checkbox_social" | "sign_in_notice_social";

let googleConfigured = false;

function configureGoogle() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  googleConfigured = true;
}

/** Social sign-in is native-only; the web build keeps email and password. */
export async function availableSocialProviders(): Promise<SocialProvider[]> {
  if (Platform.OS === "web") return [];
  const apple =
    Platform.OS === "ios" && (await AppleAuthentication.isAvailableAsync());
  return apple ? ["apple", "google"] : ["google"];
}

async function signInWithApple(): Promise<
  { user: User; name: string } | { cancelled: true }
> {
  // Apple embeds the SHA-256 of the nonce in the ID token; Supabase hashes the
  // raw value we hand it and compares, which blocks token replay.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      err.code === "ERR_REQUEST_CANCELED"
    ) {
      return { cancelled: true };
    }
    throw err;
  }
  if (!credential.identityToken) {
    throw new Error("Apple did not return an identity token");
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple sends the name only on the first authorization for this app, and
  // never inside the ID token — this credential is the one chance to keep it.
  const name = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(" ");
  return { user: data.user, name };
}

async function signInWithGoogle(): Promise<
  { user: User; name: string } | { cancelled: true }
> {
  configureGoogle();
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }

  let response;
  try {
    response = await GoogleSignin.signIn();
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.IN_PROGRESS) {
      return { cancelled: true };
    }
    throw err;
  }
  if (!isSuccessResponse(response)) return { cancelled: true };

  const { idToken, user } = response.data;
  if (!idToken) throw new Error("Google did not return an ID token");

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) throw error;
  return { user: data.user, name: user.name ?? "" };
}

async function hasLegalAcceptance(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_legal_acceptances")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Signs in with Apple or Google, creating the account on first use. Either
 * screen can create an account this way, so both the provider's name and the
 * legal acceptance are written here rather than by the sign-up form. Neither
 * write blocks the user — the account already exists — so failures go to
 * Sentry.
 */
export async function signInWithProvider(
  provider: SocialProvider,
  acceptanceMethod: SocialAcceptanceMethod
): Promise<SocialSignInResult> {
  let result: { user: User; name: string } | { cancelled: true };
  try {
    result =
      provider === "apple" ? await signInWithApple() : await signInWithGoogle();
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "social-sign-in", provider },
    });
    return {
      error: `Couldn't sign in with ${provider === "apple" ? "Apple" : "Google"}. Try again, or use your email.`,
    };
  }
  if ("cancelled" in result) return result;

  const { user, name } = result;
  const trimmedName = name.trim();
  if (trimmedName) {
    try {
      await fillProfileNameIfMissing(user.id, trimmedName);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: "signup-name", provider },
      });
    }
  }

  try {
    if (!(await hasLegalAcceptance(user.id))) {
      void recordLegalAcceptance(acceptanceMethod);
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "legal-acceptance", provider },
    });
  }

  return { ok: true };
}

/**
 * Apple requires revoking the Sign in with Apple token when the account is
 * deleted. Revocation needs a fresh authorization code, which only a new
 * authorization produces. Resolves null for accounts without an Apple
 * identity; throws if the user cancels, since deletion must not proceed
 * without revocation.
 */
export async function appleAuthorizationCodeForDeletion(
  user: User
): Promise<string | null> {
  const hasApple = user.identities?.some((i) => i.provider === "apple");
  if (!hasApple) return null;
  if (Platform.OS !== "ios") {
    throw new Error("Apple-backed accounts can only be deleted on iOS");
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [],
  });
  if (!credential.authorizationCode) {
    throw new Error("Apple did not return an authorization code");
  }
  return credential.authorizationCode;
}
