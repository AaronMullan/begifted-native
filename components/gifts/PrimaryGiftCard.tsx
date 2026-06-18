import { useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Image, StyleSheet, View } from "react-native";
import { Button, Snackbar, Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography, FontFamily, Radii } from "../../lib/typography";
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

const IMAGE_SIZE = 200;

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
  const [openFailed, setOpenFailed] = useState(false);
  const logClick = useLogOutboundClick();

  useEffect(() => {
    if (!suggestion.image_url) return;
    Image.getSize(
      suggestion.image_url,
      (w, h) => setShowImage(w >= IMAGE_SIZE && h >= IMAGE_SIZE),
      () => setShowImage(false)
    );
  }, [suggestion.image_url]);

  const handleViewProduct = async () => {
    if (!suggestion.link) return;
    logClick.mutate({
      recipientId: suggestion.recipient_id,
      giftSuggestionId: suggestion.id,
      occasionId: occasionId ?? suggestion.occasion_id ?? null,
      productUrl: suggestion.link,
    });
    const opened = await openLink(suggestion.link);
    if (!opened) setOpenFailed(true);
  };

  const handleCopyLink = async () => {
    if (!suggestion.link) return;
    await Clipboard.setStringAsync(suggestion.link);
    setOpenFailed(false);
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.topRow}>
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

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{suggestion.title}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(suggestion.price)}</Text>
            {suggestion.link && (
              <Button
                mode="text"
                compact
                textColor={Colors.brand.gold}
                onPress={handleViewProduct}
                labelStyle={styles.ctaLabel}
              >
                View Product ›
              </Button>
            )}
          </View>
        </View>

        {suggestion.description && (
          <View style={styles.whySection}>
            <Text style={styles.whyHeading}>Why This Fits</Text>
            <Text style={styles.whyBody}>{suggestion.description}</Text>
          </View>
        )}

        <View style={styles.bottomRow}>
          <GiftCardActionButton
            suggestion={suggestion}
            occasionId={occasionId}
          />
        </View>
      </View>

      <Snackbar
        visible={openFailed}
        onDismiss={() => setOpenFailed(false)}
        duration={6000}
        action={{ label: "Copy link", onPress: handleCopyLink }}
      >
        We couldn&apos;t open this product page. Try copying the link instead.
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 20,
    // Block-level rhythm between image / title-block / why / actions.
    gap: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  imageWrap: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    // Title sits tight above its price/CTA row (Figma: ~5pt), distinct from the
    // larger block gap to the "Why this fits" section.
    gap: 4,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  price: {
    fontFamily: FontFamily.sans.semibold,
    color: Colors.brand.gold,
    fontSize: 11,
    lineHeight: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaLabel: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: 11,
    lineHeight: 12,
    marginVertical: 0,
  },
  whySection: {
    gap: 6,
    // Extra separation from the title block (Figma: ~26pt total with card gap).
    marginTop: 8,
  },
  whyHeading: {
    fontFamily: FontFamily.sans.semibold,
    color: Colors.darks.black,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  whyBody: {
    fontFamily: FontFamily.sans.regular,
    color: Colors.darks.black,
    fontSize: 10,
    lineHeight: 12,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 4,
  },
});
