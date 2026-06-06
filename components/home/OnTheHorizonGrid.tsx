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
      <View style={styles.dateRow}>
        <Text style={styles.dateText}>{formatShortDate(occasion.date)}</Text>
        <MaterialIcons
          name="chevron-right"
          size={12}
          color={Colors.brand.gold}
        />
      </View>
    </Pressable>
  );
}

// Spec: Figma frame 2182:2182 "On the horizon" cards (175x70, radius 12,
// transparent fill, 2px medium-teal stroke). Dark-teal H3 title, gold large-CTA
// date pinned to the bottom.
const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  sectionLabel: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.gold,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: Colors.transparent,
    borderWidth: 2,
    borderColor: Colors.brand.mediumTeal,
    borderRadius: Radii.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
    minHeight: 70,
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    ...Typography.h3,
    color: Colors.brand.darkTeal,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  dateText: {
    ...Typography.largeCta,
    color: Colors.brand.gold,
  },
});
