import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
import type { GiftSuggestion } from "../../types/recipient";
import GiftCardExpandButton from "./GiftCardExpandButton";

type CollapsedGiftCardProps = {
  suggestion: GiftSuggestion;
  onPress: () => void;
};

export default function CollapsedGiftCard({
  suggestion,
  onPress,
}: CollapsedGiftCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Expand ${suggestion.title}`}
      style={styles.row}
    >
      <Text style={styles.title} numberOfLines={1}>
        {suggestion.title}
      </Text>
      <View style={styles.actionWrap}>
        <GiftCardExpandButton expanded={false} onPress={onPress} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    // 16.5 + 23 (h2 line) + 16.5 = 56pt row height (Figma).
    paddingVertical: 16.5,
    // Title matches PrimaryGiftCard's content inset so titles line up across
    // states; the chevron sits closer to the edge, matching the expanded
    // card's floating chevron (right: 13).
    paddingLeft: 23,
    paddingRight: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
