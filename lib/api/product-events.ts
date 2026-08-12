import { Platform } from "react-native";
import { supabase } from "../supabase";

/**
 * Core lifecycle events consumed downstream by lifecycle tooling
 * (Customer.io). `signed_up` is in the vocabulary but never logged from the
 * client — a DB trigger on auth.users writes it server-side, where a signup
 * that ends without a session (email verification pending) can't drop it.
 * `recommendation_engaged` is not an event here: outbound_clicks already
 * captures it.
 */
export type ProductEventName =
  "signed_up" | "person_added" | "occasion_added" | "recommendations_viewed";

export type ProductEventProperties = Record<
  string,
  string | number | boolean | null
>;

export type ProductEventInput = {
  name: ProductEventName;
  properties?: ProductEventProperties;
};

/**
 * Fire-and-forget append to the product_events sink. Errors are swallowed
 * (logged only) so event logging never blocks or breaks a product flow.
 */
export function logProductEvents(
  userId: string,
  events: ProductEventInput[]
): void {
  if (!userId || events.length === 0) return;
  const rows = events.map((event) => ({
    user_id: userId,
    event_name: event.name,
    properties: event.properties ?? {},
    platform: Platform.OS,
  }));
  supabase
    .from("product_events")
    .insert(rows)
    .then(({ error }) => {
      if (error) console.error("logProductEvents failed:", error);
    });
}

export function logProductEvent(
  userId: string,
  name: ProductEventName,
  properties?: ProductEventProperties
): void {
  logProductEvents(userId, [{ name, properties }]);
}
