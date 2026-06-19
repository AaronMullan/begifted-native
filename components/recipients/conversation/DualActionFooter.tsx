import type React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "react-native-paper";
import { BOTTOM_NAV_HEIGHT } from "@/lib/constants";

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
      <Button
        mode="outlined"
        onPress={onSecondary}
        disabled={secondaryDisabled}
        style={styles.button}
      >
        {secondaryLabel}
      </Button>

      <Button
        mode="contained"
        buttonColor="#000000"
        onPress={onPrimary}
        disabled={primaryDisabled}
        loading={primaryLoading}
        style={styles.button}
      >
        {primaryLabel}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
  },
});
