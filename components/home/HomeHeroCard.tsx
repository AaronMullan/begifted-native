import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
import type { Occasion } from "../../lib/api";
import {
  daysUntil,
  formatOccasionTypeLower,
  formatShortDate,
  possessive,
} from "../../utils/home-occasions";
import OccasionAvatar from "./OccasionAvatar";

type HomeHeroCardProps = {
  occasion: Occasion;
};

export default function HomeHeroCard({ occasion }: HomeHeroCardProps) {
  const router = useRouter();
  const recipientName = occasion.recipient?.name ?? "Someone";
  const headline = `${possessive(recipientName)} ${formatOccasionTypeLower(
    occasion.occasion_type
  )} is coming up.`;
  const days = daysUntil(occasion.date);
  const dayLabel =
    days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  const countdown = `${dayLabel} • ${formatShortDate(occasion.date)}`;

  const handlePress = () => {
    // TODO(DEV-69): navigate to gift recommendation page for this occasion
    router.push(`/contacts/${occasion.recipient_id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`View ${possessive(recipientName)} gift ideas`}
      style={styles.card}
    >
      <OccasionAvatar
        name={recipientName}
        size={45}
        photoUrl={occasion.recipient?.photo_url}
      />
      <View style={styles.header}>
        <Text style={styles.countdown}>{countdown}</Text>
        <Text variant="displaySmall" style={styles.headline}>
          {headline}
        </Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>View gift ideas</Text>
          <MaterialIcons name="chevron-right" size={14} color={Colors.white} />
        </View>
      </View>
    </Pressable>
  );
}

// Spec: Figma frame 2182:2182 "module: primary" (360x205, dark teal, radius 12).
// 45px avatar top-left, eyebrow + H1 headline, large CTA pinned to the bottom.
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.brand.darkTeal,
    borderRadius: Radii.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 205,
    justifyContent: "space-between",
    gap: 16,
  },
  header: {
    gap: 6,
  },
  countdown: {
    ...Typography.eyebrow,
    color: Colors.white,
  },
  headline: {
    ...Typography.h1,
    color: Colors.white,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
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
