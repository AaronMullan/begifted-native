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
import OccasionAvatar from "./OccasionAvatar";

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
        {occasions.map((occasion, index) => (
          <NextUpCard key={occasion.id} occasion={occasion} index={index} />
        ))}
      </ScrollView>
    </View>
  );
}

function NextUpCard({
  occasion,
  index,
}: {
  occasion: Occasion;
  index: number;
}) {
  const router = useRouter();
  const name = occasion.recipient?.name ?? "Someone";
  const days = daysUntil(occasion.date);
  const dayLabel =
    days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  // Figma alternates the two visible cards: left medium-teal, right gold.
  const isGold = index % 2 === 1;

  const handlePress = () => {
    router.push(`/gifts/${occasion.recipient_id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`View ${possessive(name)} gift ideas`}
      style={[
        styles.card,
        {
          backgroundColor: isGold ? Colors.brand.gold : Colors.brand.mediumTeal,
        },
      ]}
    >
      <OccasionAvatar name={name} size={30} />
      <View style={styles.body}>
        <Text style={styles.countdown}>
          {dayLabel} · {formatShortDate(occasion.date)}
        </Text>
        <Text style={styles.title}>
          {possessive(name)} {formatOccasionType(occasion.occasion_type)}
        </Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>View {possessive(name)} gift ideas</Text>
        <MaterialIcons
          name="chevron-right"
          size={14}
          color={Colors.brand.darkTeal}
        />
      </View>
    </Pressable>
  );
}

// Spec: Figma frame 2182:2182 NEXT UP cards (175x150, radius 12). Cards
// alternate medium-teal / gold; 30px avatar top-left, dark-teal eyebrow,
// white H2 title, dark-teal large CTA. Carousel keeps horizontal scrolling
// while the first two tiles line up like the static 2-up design.
const CARD_WIDTH = 175;

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  sectionLabel: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.gold,
    paddingHorizontal: 4,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 20,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radii.md,
    paddingHorizontal: 13,
    paddingVertical: 15,
    minHeight: 150,
    justifyContent: "space-between",
    gap: 10,
  },
  body: {
    gap: 4,
  },
  countdown: {
    ...Typography.eyebrow,
    color: Colors.brand.darkTeal,
  },
  title: {
    ...Typography.h2,
    color: Colors.white,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ctaText: {
    ...Typography.largeCta,
    color: Colors.brand.darkTeal,
  },
});
