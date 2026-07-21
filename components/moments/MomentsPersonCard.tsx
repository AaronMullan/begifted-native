import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { Radii, Typography } from "../../lib/typography";
import Avatar from "../Avatar";

type MomentsPersonCardProps = {
  name: string;
  photoUrl?: string | null;
  onPress: () => void;
  onLongPress?: () => void;
  /** When provided, renders the "…" overflow (used to delete the occasion). */
  onOverflow?: () => void;
};

/**
 * A recipient with an occasion on the selected day (Figma "People module").
 * Tapping opens their gift ideas; the overflow is only drawn when there are
 * several people that day, matching the multi-person frame.
 */
export default function MomentsPersonCard({
  name,
  photoUrl,
  onPress,
  onLongPress,
  onOverflow,
}: MomentsPersonCardProps) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, gift ideas`}
    >
      <Avatar name={name} size={32} context="list" photoUrl={photoUrl} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.giftIdeas}>Gift Ideas ›</Text>
      </View>
      {onOverflow && (
        <Pressable
          onPress={onOverflow}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Options for ${name}`}
        >
          <MaterialIcons
            name="more-horiz"
            size={20}
            color={Colors.brand.darkTeal}
          />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 50,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...Typography.h3,
    color: Colors.brand.darkTeal,
  },
  giftIdeas: {
    ...Typography.largeCta,
    color: Colors.brand.gold,
  },
});
