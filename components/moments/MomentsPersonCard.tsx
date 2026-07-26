import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import Avatar from "../Avatar";

type MomentsPersonCardProps = {
  name: string;
  /** The moment's display name, e.g. "Birthday" — prefixes "Gift Ideas". */
  occasionLabel?: string;
  photoUrl?: string | null;
  onPress: () => void;
  onLongPress?: () => void;
  /** When provided, renders the "…" overflow (used to delete the occasion). */
  onOverflow?: () => void;
};

/**
 * A recipient with an occasion on the selected day (Figma "Person List Row",
 * day-view variants 4994:2876 / 5198:8695). Tapping opens their gift ideas.
 */
export default function MomentsPersonCard({
  name,
  occasionLabel,
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
      <Avatar name={name} size={30} context="list" photoUrl={photoUrl} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.giftIdeasRow}>
          <Text style={styles.giftIdeas} numberOfLines={1}>
            {occasionLabel ? `${occasionLabel} Gift Ideas` : "Gift Ideas"}
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={16}
            color={Colors.brand.gold}
          />
        </View>
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
            size={18}
            color={Colors.brand.mediumTeal}
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
    gap: 14,
    minHeight: 62,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingLeft: 7,
    paddingRight: 12,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
  },
  name: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  giftIdeasRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  giftIdeas: {
    ...Typography.largeCta,
    color: Colors.brand.gold,
    flexShrink: 1,
  },
});
