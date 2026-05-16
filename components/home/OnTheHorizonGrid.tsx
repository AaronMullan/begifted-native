import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
import type { Occasion } from "../../lib/api";
import {
  formatOccasionType,
  formatShortDate,
  possessive,
} from "../../utils/home-occasions";
import OccasionOverflowButton from "./OccasionOverflowButton";

type OnTheHorizonGridProps = {
  occasions: Occasion[];
};

export default function OnTheHorizonGrid({ occasions }: OnTheHorizonGridProps) {
  if (occasions.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>ON THE HORIZON</Text>
      <View style={styles.grid}>
        {occasions.map((occasion) => (
          <HorizonCard key={occasion.id} occasion={occasion} />
        ))}
      </View>
    </View>
  );
}

function HorizonCard({ occasion }: { occasion: Occasion }) {
  const router = useRouter();
  const name = occasion.recipient?.name ?? "Someone";

  const handlePress = () => {
    router.push(`/gifts/${occasion.recipient_id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`View ${possessive(name)} ${formatOccasionType(
        occasion.occasion_type
      )}`}
      style={styles.card}
    >
      <Text style={styles.title}>
        {possessive(name)} {formatOccasionType(occasion.occasion_type)}
      </Text>
      <View style={styles.footer}>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{formatShortDate(occasion.date)}</Text>
          <MaterialIcons
            name="chevron-right"
            size={10}
            color={Colors.brand.gold}
          />
        </View>
        <OccasionOverflowButton occasion={occasion} tint={Colors.brand.mediumTeal} />
      </View>
    </Pressable>
  );
}

// Spec: Figma "module: tertiary" (170x70, radius 12, transparent fill,
// 2px white stroke).
const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  sectionLabel: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.mediumTeal,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  card: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: Colors.transparent,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: Radii.md,
    paddingHorizontal: 10,
    paddingVertical: 11,
    minHeight: 70,
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    ...Typography.h3,
    color: Colors.brand.mediumTeal,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  dateText: {
    ...Typography.smallCta,
    color: Colors.brand.gold,
  },
});
