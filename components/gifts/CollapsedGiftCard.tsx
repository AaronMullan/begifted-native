import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import type { GiftSuggestion } from "../../types/recipient";
import GiftCardActionButton from "./GiftCardActionButton";

type CollapsedGiftCardProps = {
  suggestion: GiftSuggestion;
  onPress: () => void;
  occasionId?: string | null;
};

export default function CollapsedGiftCard({
  suggestion,
  onPress,
  occasionId,
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
        <GiftCardActionButton
          suggestion={suggestion}
          variant="collapsed"
          occasionId={occasionId}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: "Fraunces_600SemiBold",
    color: Colors.blues.dark,
    fontSize: 16,
  },
  actionWrap: {
    flexShrink: 0,
  },
});
