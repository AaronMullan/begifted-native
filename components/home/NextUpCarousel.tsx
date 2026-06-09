import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import type { Occasion } from "../../lib/api";
import {
  daysUntil,
  formatOccasionType,
  formatShortDate,
  possessive,
} from "../../utils/home-occasions";
import OccasionAvatar from "./OccasionAvatar";
import { HOME_EDGE_INSET } from "./home-layout";

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
        style={styles.scroll}
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
  const cardColor = isGold ? Colors.brand.gold : Colors.brand.mediumTeal;
  // Avatar circle is the opposite card color so it always contrasts.
  const avatarColor = isGold ? Colors.brand.mediumTeal : Colors.brand.gold;

  const handlePress = () => {
    router.push(`/gifts/${occasion.recipient_id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`View ${possessive(name)} gift ideas`}
      style={[styles.card, { backgroundColor: cardColor }]}
    >
      <OccasionAvatar
        name={name}
        size={30}
        photoUrl={occasion.recipient?.photo_url}
        circleColor={avatarColor}
        initialsColor={Colors.white}
      />
      <View style={styles.body}>
        <Text style={styles.countdown}>
          {dayLabel} · {formatShortDate(occasion.date)}
        </Text>
        <Text style={styles.title}>
          {possessive(name)} {formatOccasionType(occasion.occasion_type)}
        </Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>View Gift Ideas</Text>
          <MaterialIcons
            name="chevron-right"
            size={14}
            color={Colors.brand.darkTeal}
          />
        </View>
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
    // Section head → cards (Figma Dev Mode, DEV-161): 17pt.
    gap: Spacing.sectionHeadToContent,
  },
  sectionLabel: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.gold,
    paddingHorizontal: 4,
  },
  scroll: {
    // Bleed past the content column so cards run to the screen edges and the
    // next card peeks — the Figma carousel-leakage cue.
    marginHorizontal: -HOME_EDGE_INSET,
  },
  scrollContent: {
    gap: 10,
    paddingHorizontal: HOME_EDGE_INSET,
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
