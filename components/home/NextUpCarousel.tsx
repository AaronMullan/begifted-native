import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import type { DatedOccasion } from "../../utils/home-occasions";
import {
  daysUntil,
  formatOccasionType,
  possessive,
  stripRecipientName,
} from "../../utils/home-occasions";
import { formatOccasionDate } from "../../utils/occasion-dates";
import OccasionAvatar from "./OccasionAvatar";
import OccasionOverflowMenu from "./OccasionOverflowMenu";
import { HOME_CARD_GAP, HOME_EDGE_INSET, nextUpCardWidth } from "./home-layout";

type NextUpCarouselProps = {
  occasions: DatedOccasion[];
};

export default function NextUpCarousel({ occasions }: NextUpCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();

  if (occasions.length === 0) return null;

  // One large card left-aligned with the content column, with a wide sliver
  // of the next card visible so the section still reads as scrollable.
  const cardWidth = nextUpCardWidth(windowWidth);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>NEXT UP</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={cardWidth + HOME_CARD_GAP}
        decelerationRate="fast"
      >
        {assignSchemes(occasions).map(({ occasion, scheme }) => (
          <NextUpCard
            key={occasion.id}
            occasion={occasion}
            scheme={scheme}
            width={cardWidth}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// Card backgrounds are assigned pseudo-randomly among the three brand colors.
// Each scheme defines its own avatar counterpart (always a contrasting brand
// color) and eyebrow color — dark teal reads fine on gold/teal but drops to
// ~2:1 contrast on rose, so rose uses cream.
const CARD_SCHEMES = [
  {
    card: Colors.brand.gold,
    avatar: Colors.brand.mediumTeal,
    eyebrow: Colors.brand.darkTeal,
  },
  {
    card: Colors.brand.rose,
    avatar: Colors.brand.mediumTeal,
    eyebrow: Colors.brand.beigeLight,
  },
  {
    card: Colors.brand.mediumTeal,
    avatar: Colors.brand.gold,
    eyebrow: Colors.brand.darkTeal,
  },
] as const;

type CardScheme = (typeof CARD_SCHEMES)[number];

function schemeIndex(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % CARD_SCHEMES.length;
}

// Each card prefers the scheme hashed from its occasion id, but a card that
// would repeat its left neighbor's scheme is bumped to the next one. The hash
// alone is uniform yet allows monochrome runs (a real account hashed 5 of 6
// occasions to gold); the bump guarantees adjacent variety. Colors remain
// stable across re-renders, refetches, and sessions because the list is
// date-sorted, so the inputs only change when an occasion is added or passes.
function assignSchemes(occasions: DatedOccasion[]) {
  let prevIndex = -1;
  return occasions.map((occasion) => {
    let index = schemeIndex(occasion.id);
    if (index === prevIndex) index = (index + 1) % CARD_SCHEMES.length;
    prevIndex = index;
    return { occasion, scheme: CARD_SCHEMES[index] };
  });
}

function NextUpCard({
  occasion,
  scheme,
  width,
}: {
  occasion: DatedOccasion;
  scheme: CardScheme;
  width: number;
}) {
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
      style={[styles.card, { width, backgroundColor: scheme.card }]}
    >
      <OccasionAvatar
        name={name}
        size={30}
        photoUrl={occasion.recipient?.photo_url}
        circleColor={scheme.avatar}
        initialsColor={Colors.white}
      />
      <View style={styles.body}>
        <Text style={[styles.countdown, { color: scheme.eyebrow }]}>
          {dayLabel} • {formatOccasionDate(occasion.date)}
        </Text>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{possessive(name)}</Text>
          <Text style={styles.title}>
            {formatOccasionType(
              stripRecipientName(occasion.occasion_type, name)
            )}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>View Gift Ideas</Text>
          <MaterialIcons name="chevron-right" size={16} color={Colors.white} />
        </View>
        <OccasionOverflowMenu occasion={occasion} dotColor={Colors.white} />
      </View>
    </Pressable>
  );
}

// Spec: Figma frame 4302:1538 NEXT UP card (230x160 at the 402pt frame, radius
// 12, insets 12 horizontal / 14 top / 19 bottom). The active card sits at the
// content gutter and the carousel snaps card-to-card, with a wide sliver of
// the next card visible (see `nextUpCardWidth`). Card color comes from
// `occasionScheme`; 30px avatar top-left, scheme eyebrow, white H2 title,
// white large CTA + white overflow dots on the bottom row.
const styles = StyleSheet.create({
  section: {
    gap: Spacing.sectionHeadToContent,
  },
  sectionLabel: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.gold,
    // Section heads sit one extra inset past the screen gutter (Figma x=32 on a
    // 402 frame; the cards/hero sit at the 20pt gutter). Derived from tokens so
    // it tracks the gutter, not a magic 12.
    paddingLeft: Spacing.sectionHeadInset - Spacing.screenGutter,
  },
  scroll: {
    // Bleed past the content column so cards run to the screen edges and the
    // next card peeks — the Figma carousel-leakage cue.
    marginHorizontal: -HOME_EDGE_INSET,
  },
  scrollContent: {
    gap: HOME_CARD_GAP,
    paddingHorizontal: HOME_EDGE_INSET,
  },
  card: {
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 19,
    minHeight: 160,
    justifyContent: "space-between",
    gap: 10,
  },
  body: {
    gap: 4,
  },
  titleGroup: {
    // Name and occasion stack on separate lines (DEV-163) to free up layout
    // room for responsive resizing (DEV-162). Tight line stacking; exact
    // spacing/type pending the Figma Dev Mode audit (DEV-161).
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countdown: {
    ...Typography.eyebrow,
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
    color: Colors.white,
  },
});
