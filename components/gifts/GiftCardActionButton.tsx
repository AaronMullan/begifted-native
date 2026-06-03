import { Pressable, StyleSheet } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import type { GiftSuggestion } from "../../types/recipient";
import { useGiftActionDrawer } from "./GiftActionDrawerProvider";

type GiftCardActionButtonProps = {
  suggestion: GiftSuggestion;
  occasionId?: string | null;
};

export default function GiftCardActionButton({
  suggestion,
  occasionId,
}: GiftCardActionButtonProps) {
  const { openDrawer } = useGiftActionDrawer();

  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    openDrawer(suggestion, occasionId);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Gift options"
      style={styles.button}
    >
      <MaterialIcons name="more-horiz" size={22} color={Colors.blues.dark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});
