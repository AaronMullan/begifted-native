import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
import type { GiftSuggestion } from "../../types/recipient";
import GiftCardExpandButton from "./GiftCardExpandButton";

type CollapsedGiftCardProps = {
  suggestion: GiftSuggestion;
  onPress: () => void;
  /** Past Gifts use an outlined (stroke, no fill) row to read as distinct from
   * the filled "new" recommendation cards. */
  outlined?: boolean;
  /** Chevron color, forwarded to the expand affordance. Past Gift rows pass dark
   * teal; active recommendations use the default gold. */
  chevronColor?: string;
};

export default function CollapsedGiftCard({
  suggestion,
  onPress,
  outlined = false,
  chevronColor,
}: CollapsedGiftCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Expand ${suggestion.title}`}
      style={[styles.row, outlined ? styles.outlined : styles.filled]}
    >
      <Text style={styles.title} numberOfLines={1}>
        {suggestion.title}
      </Text>
      <View style={styles.actionWrap}>
        <GiftCardExpandButton
          expanded={false}
          onPress={onPress}
          color={chevronColor}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Radii.md,
    // 19 + 18 (h2 line) + 19 ≈ 56pt row height (Figma).
    paddingVertical: 19,
    // Match PrimaryGiftCard content inset so titles line up across states.
    paddingHorizontal: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  filled: {
    backgroundColor: Colors.white,
  },
  outlined: {
    backgroundColor: Colors.transparent,
    borderWidth: 2,
    borderColor: Colors.brand.mediumTeal,
  },
  title: {
    ...Typography.h2,
    flex: 1,
    color: Colors.brand.darkTeal,
  },
  actionWrap: {
    flexShrink: 0,
  },
});
