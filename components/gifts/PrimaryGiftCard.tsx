import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { openLink } from "../../lib/open-link";
import { useLogOutboundClick } from "../../hooks/use-log-outbound-click";
import type { GiftSuggestion } from "../../types/recipient";
import GiftCardActionButton from "./GiftCardActionButton";
import GiftCardExpandButton from "./GiftCardExpandButton";

type PrimaryGiftCardProps = {
  suggestion: GiftSuggestion;
  occasionId?: string | null;
  onCollapse: () => void;
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
  onCollapse,
}: PrimaryGiftCardProps) {
  const [showImage, setShowImage] = useState(false);
  const logClick = useLogOutboundClick();

  useEffect(() => {
    if (!suggestion.image_url) return;
    Image.getSize(
      suggestion.image_url,
      (w, h) => setShowImage(w >= MIN_IMAGE_SIZE && h >= MIN_IMAGE_SIZE),
      () => setShowImage(false)
    );
  }, [suggestion.image_url]);

  const handleViewProduct = () => {
    if (!suggestion.link) return;
    logClick.mutate({
      recipientId: suggestion.recipient_id,
      giftSuggestionId: suggestion.id,
      occasionId: occasionId ?? suggestion.occasion_id ?? null,
      productUrl: suggestion.link,
    });
    openLink(suggestion.link);
  };

  return (
    <View style={styles.card}>
      <View style={styles.actionRow}>
        <GiftCardActionButton suggestion={suggestion} occasionId={occasionId} />
        <GiftCardExpandButton expanded onPress={onCollapse} />
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
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(suggestion.price)}</Text>
        {suggestion.link && (
          <Button
            mode="text"
            compact
            textColor={Colors.blues.dark}
            onPress={handleViewProduct}
            labelStyle={styles.ctaLabel}
          >
            Get this gift ›
          </Button>
        )}
      </View>

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
    alignItems: "center",
    gap: 8,
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
    color: Colors.yellows.gold,
    fontSize: 16,
    fontWeight: "500",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
