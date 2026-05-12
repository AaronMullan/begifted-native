import { useEffect, useState } from "react";
import { Image, Linking, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import type { GiftSuggestion } from "../../types/recipient";
import GiftCardActionButton from "./GiftCardActionButton";

type PrimaryGiftCardProps = {
  suggestion: GiftSuggestion;
  occasionId?: string | null;
};

const MIN_IMAGE_SIZE = 200;

const formatPrice = (price?: number) => {
  if (!price) return "Price not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
};

export default function PrimaryGiftCard({
  suggestion,
  occasionId,
}: PrimaryGiftCardProps) {
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (!suggestion.image_url) return;
    Image.getSize(
      suggestion.image_url,
      (w, h) => setShowImage(w >= MIN_IMAGE_SIZE && h >= MIN_IMAGE_SIZE),
      () => setShowImage(false)
    );
  }, [suggestion.image_url]);

  const handleViewProduct = () => {
    if (suggestion.link) Linking.openURL(suggestion.link);
  };

  return (
    <View style={styles.card}>
      <View style={styles.actionRow}>
        <GiftCardActionButton
          suggestion={suggestion}
          variant="expanded"
          occasionId={occasionId}
        />
      </View>

      {showImage && suggestion.image_url && (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: suggestion.image_url }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      )}

      <Text style={styles.title}>{suggestion.title}</Text>
      <Text style={styles.price}>{formatPrice(suggestion.price)}</Text>

      {suggestion.link && (
        <View style={styles.ctaRow}>
          <Button
            mode="text"
            compact
            textColor={Colors.blues.dark}
            onPress={handleViewProduct}
            labelStyle={styles.ctaLabel}
          >
            View Product ›
          </Button>
        </View>
      )}

      {suggestion.description && (
        <View style={styles.whySection}>
          <Text style={styles.whyHeading}>Why this fits</Text>
          <Text style={styles.whyBody}>{suggestion.description}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  imageWrap: {
    aspectRatio: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontFamily: "Fraunces_600SemiBold",
    color: Colors.blues.dark,
    fontSize: 20,
    lineHeight: 24,
  },
  price: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.blues.dark,
    fontSize: 16,
    fontWeight: "500",
  },
  ctaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: -8,
  },
  ctaLabel: {
    fontFamily: "RobotoFlex_400Regular",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  whySection: {
    gap: 6,
    paddingTop: 4,
  },
  whyHeading: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.blues.dark,
    fontSize: 13,
    fontWeight: "700",
  },
  whyBody: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.blues.dark,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
  },
});
