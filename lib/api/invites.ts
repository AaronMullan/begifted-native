/**
 * Friend invites API. Rows are read directly (RLS limits them to the
 * inviter); every write goes through a SECURITY DEFINER function that
 * enforces the five-invite limit and the app_config.invites_enabled switch.
 */

import { supabase } from "../supabase";

export const INVITE_LIMIT = 5;

const INVITE_LINK_BASE = "https://begifted.vercel.app/open/invite";

export interface Invite {
  id: string;
  code: string;
  created_at: string;
  sent_at: string | null;
  accepted_at: string | null;
}

export function inviteLink(code: string): string {
  return `${INVITE_LINK_BASE}?code=${encodeURIComponent(code)}`;
}

/** The caller's sent invites, newest first. */
export async function fetchSentInvites(userId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from("invites")
    .select("id, code, created_at, sent_at, accepted_at")
    .eq("inviter_id", userId)
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * The invite to put in the next share: the caller's pending one, or a new one
 * when they have sends left. It doesn't count until `markInviteSent`.
 */
export async function createInvite(): Promise<Invite> {
  const { data, error } = await supabase.rpc("create_invite");
  if (error) throw error;
  return data as Invite;
}

export async function markInviteSent(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_invite_sent", {
    invite_id: inviteId,
  });
  if (error) throw error;
}

/**
 * Credits the signed-in account to the invite. The server ignores accounts
 * older than a week, so an existing user opening a friend's link is a no-op.
 */
export async function acceptInvite(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("accept_invite", {
    invite_code: code,
  });
  if (error) throw error;
  return data === true;
}
