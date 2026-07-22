import type React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BOTTOM_NAV_HEIGHT } from "@/lib/constants";
import { PrimaryCta } from "@/components/PrimaryCta";

type DualActionFooterProps = {
  secondaryLabel: string;
  onSecondary: () => void;
  secondaryDisabled?: boolean;
  primaryLabel?: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
};

/**
 * Shared bottom action bar for the recipient-conversation flow: an outlined
 * secondary button (Back/Skip/Cancel) beside a contained primary button
 * (default "Continue"). Owns the row layout and the safe-area + bottom-nav
 * padding so the three flow views (DataReviewView, OccasionsSelectionView,
 * ManualDataEntry) no longer each redefine it.
 */
export const DualActionFooter: React.FC<DualActionFooterProps> = ({
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  primaryLabel = "Continue",
  onPrimary,
  primaryDisabled = false,
  primaryLoading = false,
}) => {
  const insets = useSafeAreaInsets();
  const footerBottomPadding = BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 0);

  return (
    <View style={[styles.footer, { paddingBottom: footerBottomPadding }]}>
      <PrimaryCta
        variant="outline"
        label={secondaryLabel}
        onPress={onSecondary}
        disabled={secondaryDisabled}
        style={styles.button}
      />
      <PrimaryCta
        label={primaryLabel}
        onPress={onPrimary}
        disabled={primaryDisabled}
        state={primaryLoading ? "loading" : "idle"}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Spec: CTAs hug their width and center in conversational flows rather than
  // stretching edge-to-edge.
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 16,
    gap: 12,
  },
  // Two 170pt-min pills + gap can exceed narrow screens; let them shrink
  // evenly instead of overflowing.
  button: {
    flexShrink: 1,
  },
});
