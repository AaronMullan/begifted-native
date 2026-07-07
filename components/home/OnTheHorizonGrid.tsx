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
import type { Occasion } from "../../lib/api";
import {
  formatOccasionType,
  formatShortDate,
  possessive,
  stripRecipientName,
} from "../../utils/home-occasions";
import { homeCardWidth, HOME_EDGE_INSET } from "./home-layout";

type OnTheHorizonGridProps = {
  occasions: Occasion[];
};

export default function OnTheHorizonGrid({ occasions }: OnTheHorizonGridProps) {
  const { width: windowWidth } = useWindowDimensions();

  if (occasions.length === 0) return null;

  // Size cards to the viewport so two full cards + a fixed peek always fit,
  // regardless of phone width (DEV-162).
  const cardWidth = homeCardWidth(windowWidth);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>ON THE HORIZON</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {occasions.map((occasion) => (
          <HorizonCard
            key={occasion.id}
            occasion={occasion}
            width={cardWidth}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function HorizonCard({
  occasion,
  width,
}: {
  occasion: Occasion;
  width: number;
}) {
  const router = useRouter();
  const name = occasion.recipient?.name ?? "Someone";
  const occasionType = formatOccasionType(
    stripRecipientName(occasion.occasion_type, name)
  );

  const handlePress = () => {
    router.push(`/gifts/${occasion.recipient_id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`View ${possessive(name)} ${occasionType}`}
      style={[styles.card, { width }]}
    >
      <View style={styles.titleGroup}>
        <Text style={styles.title}>{possessive(name)}</Text>
        <Text style={styles.title}>{occasionType}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{formatShortDate(occasion.date)}</Text>
          <MaterialIcons
            name="chevron-right"
            size={12}
            color={Colors.brand.gold}
          />
        </View>
      </View>
    </Pressable>
  );
}

// Spec: Figma frame 4305:1504 "On the horizon" carousel (175x80 cards at the
// 402pt frame, radius 12, transparent fill, 2px medium-teal stroke). Dark-teal
// H3 title, gold large-CTA date + overflow on the bottom row. Width is derived
// per device (see `homeCardWidth`) so two cards + a peek fit on any width and
// the next-card peek is consistent across phones (DEV-162); only the height is
// fixed here. Bleeds to the screen edges so the next card peeks.
const styles = StyleSheet.create({
  section: {
    // Section head → cards (Figma Dev Mode, DEV-161): 17pt.
    gap: Spacing.sectionHeadToContent,
  },
  sectionLabel: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.gold,
    // Section heads sit one extra inset past the screen gutter (Figma x=32 on a
    // 402 frame; the cards sit at the 20pt gutter). Derived from tokens so it
    // tracks the gutter, not a magic 12.
    paddingLeft: Spacing.sectionHeadInset - Spacing.screenGutter,
  },
  scroll: {
    marginHorizontal: -HOME_EDGE_INSET,
  },
  scrollContent: {
    gap: 10,
    paddingHorizontal: HOME_EDGE_INSET,
  },
  card: {
    backgroundColor: Colors.transparent,
    borderWidth: 2,
    borderColor: Colors.brand.mediumTeal,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 80,
    justifyContent: "space-between",
    gap: 6,
  },
  titleGroup: {
    // Name and occasion stack on separate lines (DEV-163) to free up layout
    // room for responsive resizing (DEV-162). Tight line stacking; exact
    // spacing/type pending the Figma Dev Mode audit (DEV-161).
  },
  title: {
    ...Typography.h3,
    color: Colors.brand.darkTeal,
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
    ...Typography.largeCta,
    color: Colors.brand.gold,
  },
});
