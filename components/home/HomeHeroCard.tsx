import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
import type { Occasion } from "../../lib/api";
import {
  formatOccasionTypeLower,
  possessive,
} from "../../utils/home-occasions";
import OccasionOverflowButton from "./OccasionOverflowButton";

type HomeHeroCardProps = {
  occasion: Occasion;
};

export default function HomeHeroCard({ occasion }: HomeHeroCardProps) {
  const router = useRouter();
  const recipientName = occasion.recipient?.name ?? "Someone";
  const headline = `${possessive(recipientName)} ${formatOccasionTypeLower(
    occasion.occasion_type
  )} is coming up.`;

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
      <Text variant="displaySmall" style={styles.headline}>
        {headline}
      </Text>
      <View style={styles.footer}>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            View {possessive(recipientName)} gift ideas
          </Text>
          <MaterialIcons name="chevron-right" size={14} color={Colors.white} />
        </View>
        <OccasionOverflowButton
          occasion={occasion}
          tint={Colors.brand.lightTeal}
        />
      </View>
    </Pressable>
  );
}

// Spec: Figma "module: primary" (360x170, radius ~8). We use Radii.sm and tweak
// padding/fontSize to reach the Figma proportions while staying touch-friendly.
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.brand.mediumTeal,
    borderRadius: Radii.sm,
    paddingHorizontal: 19,
    paddingVertical: 20,
    minHeight: 170,
    justifyContent: "space-between",
    gap: 16,
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
