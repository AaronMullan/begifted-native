import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
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
    // TODO(DEV-69): navigate to gift recommendation page for this occasion
    router.push(`/contacts/${occasion.recipient_id}`);
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
            size={16}
            color={Colors.yellows.gold}
          />
        </View>
        <OccasionOverflowButton occasion={occasion} tint={Colors.darks.black} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.blues.dark,
    fontSize: 13,
    letterSpacing: 1.4,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontFamily: "Fraunces_600SemiBold",
    color: Colors.blues.dark,
    fontSize: 20,
    lineHeight: 24,
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
    color: Colors.yellows.gold,
    fontSize: 13,
    fontWeight: "500",
  },
});
