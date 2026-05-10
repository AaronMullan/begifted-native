import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
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
          <MaterialIcons name="chevron-right" size={20} color={Colors.white} />
        </View>
        <OccasionOverflowButton occasion={occasion} tint={Colors.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.blues.medium,
    borderRadius: 24,
    padding: 28,
    minHeight: 240,
    justifyContent: "space-between",
    gap: 24,
  },
  headline: {
    fontFamily: "Fraunces_600SemiBold",
    color: Colors.white,
    fontSize: 34,
    lineHeight: 40,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ctaText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
