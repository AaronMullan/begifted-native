import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import type { Occasion } from "../../lib/api";
import {
  daysUntil,
  formatOccasionType,
  formatShortDate,
  possessive,
} from "../../utils/home-occasions";
import OccasionOverflowButton from "./OccasionOverflowButton";

type NextUpCarouselProps = {
  occasions: Occasion[];
};

export default function NextUpCarousel({ occasions }: NextUpCarouselProps) {
  if (occasions.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>NEXT UP</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {occasions.map((occasion) => (
          <NextUpCard key={occasion.id} occasion={occasion} />
        ))}
      </ScrollView>
    </View>
  );
}

function NextUpCard({ occasion }: { occasion: Occasion }) {
  const router = useRouter();
  const name = occasion.recipient?.name ?? "Someone";
  const days = daysUntil(occasion.date);
  const dayLabel =
    days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;

  const handlePress = () => {
    // TODO(DEV-69): navigate to gift recommendation page for this occasion
    router.push(`/contacts/${occasion.recipient_id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`View ${possessive(name)} gift ideas`}
      style={styles.card}
    >
      <Text style={styles.countdown}>
        {dayLabel} · {formatShortDate(occasion.date)}
      </Text>
      <Text style={styles.title}>
        {possessive(name)} {formatOccasionType(occasion.occasion_type)}
      </Text>
      <View style={styles.footer}>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>View {possessive(name)} gift ideas</Text>
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

const CARD_WIDTH = 280;

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
  scrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    minHeight: 160,
    justifyContent: "space-between",
    gap: 16,
  },
  countdown: {
    color: Colors.yellows.gold,
    fontSize: 13,
    fontWeight: "600",
  },
  title: {
    fontFamily: "Fraunces_600SemiBold",
    color: Colors.blues.dark,
    fontSize: 24,
    lineHeight: 28,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ctaText: {
    color: Colors.yellows.gold,
    fontSize: 13,
    fontWeight: "500",
  },
});
