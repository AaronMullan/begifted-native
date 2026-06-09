import { useMutation } from "@tanstack/react-query";
import { Platform } from "react-native";
import { insertOutboundClick, type InsertOutboundClickInput } from "../lib/api";
import { retailerDomain } from "../lib/open-link";
import { useAuth } from "./use-auth";

type LogOutboundClickVars = {
  recipientId: string;
  giftSuggestionId?: string | null;
  occasionId?: string | null;
  productUrl: string;
};

/**
 * Fire-and-forget logging of an outbound product-page click (DEV-151). Unlike
 * feedback mutations there's no optimistic update or cache invalidation — this
 * is a write-only engagement signal. Errors are swallowed (logged only) so
 * logging never blocks or crashes the link open.
 */
export function useLogOutboundClick() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: (vars: LogOutboundClickVars) => {
      if (!user) throw new Error("Must be signed in to log a click");
      const payload: InsertOutboundClickInput = {
        user_id: user.id,
        recipient_id: vars.recipientId,
        gift_suggestion_id: vars.giftSuggestionId ?? null,
        occasion_id: vars.occasionId ?? null,
        product_url: vars.productUrl,
        retailer_domain: retailerDomain(vars.productUrl),
        platform: Platform.OS,
      };
      return insertOutboundClick(payload);
    },
    onError: (err) => console.error("useLogOutboundClick failed:", err),
  });
}
