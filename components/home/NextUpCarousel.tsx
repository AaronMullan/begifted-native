import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
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
    router.push(`/gifts/${occasion.recipient_id}`);
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
            size={12}
            color={Colors.brand.gold}
          />
        </View>
        <OccasionOverflowButton
          occasion={occasion}
          tint={Colors.brand.mediumTeal}
        />
      </View>
    </Pressable>
  );
}

// Spec: Figma "module: secondary" (170x110, radius ~8.8). Carousel keeps
// horizontal scrolling but card width matches the Figma 2-up grid so the first
// two tiles visually line up like the static design.
const CARD_WIDTH = 170;

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  sectionLabel: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.mediumTeal,
    paddingHorizontal: 4,
  },
  scrollContent: {
    gap: 20,
    paddingRight: 20,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 12,
    minHeight: 110,
    justifyContent: "space-between",
    gap: 8,
  },
  countdown: {
    ...Typography.eyebrow,
    color: Colors.brand.gold,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.mediumTeal,
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
    ...Typography.smallCta,
    color: Colors.brand.gold,
  },
});
