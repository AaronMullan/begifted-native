import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Menu } from "react-native-paper";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import type { Occasion } from "../../lib/api";

type OccasionOverflowMenuProps = {
  occasion: Occasion;
  dotColor?: string;
};

/**
 * The "..." overflow on home occasion cards (Figma 4302:1538). The dots are
 * drawn as raw 3pt views rather than the `more-horiz` glyph because the icon's
 * padded box is far larger than the design's 15x3 mark and inflates the
 * spacing around it; the tap target comes from `hitSlop` instead.
 */
export default function OccasionOverflowMenu({
  occasion,
  dotColor = Colors.white,
}: OccasionOverflowMenuProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const name = occasion.recipient?.name ?? "Someone";

  const closeMenu = () => setVisible(false);

  const handleViewGifts = () => {
    closeMenu();
    router.push(`/gifts/${occasion.recipient_id}`);
  };

  const handleEdit = () => {
    closeMenu();
    router.push(`/contacts/${occasion.recipient_id}?tab=details`);
  };

  return (
    <Menu
      visible={visible}
      onDismiss={closeMenu}
      anchor={
        <Pressable
          onPress={() => setVisible(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${name}`}
          style={styles.dots}
        >
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        </Pressable>
      }
    >
      <Menu.Item
        onPress={handleViewGifts}
        title="View gift ideas"
        leadingIcon="gift-outline"
      />
      <Menu.Item onPress={handleEdit} title="Edit" leadingIcon="pencil" />
    </Menu>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
