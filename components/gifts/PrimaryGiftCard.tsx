import { useEffect, useRef, useState } from "react";
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
  /** Fired once, after the expanded card's first layout, with the card's root
   * node. The parent uses it to scroll the freshly-opened card into view. */
  onExpandLayout?: (node: View | null) => void;
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
  onExpandLayout,
}: PrimaryGiftCardProps) {
  // Three-state so the image area is reserved the moment we know a product has
  // an image (`pending`), keeping the card height stable as the bitmap loads —
  // the card must not jump after open (DEV-185). It only collapses to `hidden`
  // for missing / too-small / broken images.
  const [imageState, setImageState] = useState<
    "pending" | "visible" | "hidden"
  >(suggestion.image_url ? "pending" : "hidden");
  const [openFailed, setOpenFailed] = useState(false);
  const logClick = useLogOutboundClick();

  const cardRef = useRef<View>(null);
  const reportedLayout = useRef(false);

  useEffect(() => {
    if (!suggestion.image_url) {
      setImageState("hidden");
      return;
    }
    setImageState("pending");
    Image.getSize(
      suggestion.image_url,
      (w, h) =>
        setImageState(
          w >= IMAGE_SIZE && h >= IMAGE_SIZE ? "visible" : "hidden"
        ),
      () => setImageState("hidden")
    );
  }, [suggestion.image_url]);

  // Report the card node once, after its first layout, so the parent can scroll
  // it to a predictable spot below the header. Once only: later image-load
  // relayouts must not re-trigger a scroll.
  const handleLayout = () => {
    if (reportedLayout.current) return;
    reportedLayout.current = true;
    onExpandLayout?.(cardRef.current);
  };

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
      <View ref={cardRef} style={styles.card} onLayout={handleLayout}>
        {/* Figma floats the chevron in the top-right corner overlapping the
            content, so the image/title start at the card's top padding rather
            than being pushed down by a stacked row. */}
        <View style={styles.expandButton}>
          <GiftCardExpandButton expanded onPress={onCollapse} />
        </View>

        {imageState !== "hidden" && suggestion.image_url && (
          <View style={styles.imageWrap}>
            {imageState === "visible" && (
              <Image
                source={{ uri: suggestion.image_url }}
                style={styles.image}
                resizeMode="contain"
              />
            )}
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
    // Figma content insets: 23 horizontal, 27 top. Bottom is small (~8) because
    // the trailing "..." action sits ~17pt above the card edge in Figma and its
    // icon box already contributes the rest of that gap.
    paddingHorizontal: 23,
    paddingTop: 27,
    paddingBottom: 8,
    // Block-level rhythm between image / title-block / why / actions.
    gap: 16,
  },
  expandButton: {
    position: "absolute",
    top: 10,
    right: 13,
    zIndex: 1,
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
  },
});
