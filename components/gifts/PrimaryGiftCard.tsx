import { useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import {
  Image,
  StyleSheet,
  View,
  type ImageErrorEventData,
  type ImageLoadEventData,
  type NativeSyntheticEvent,
} from "react-native";
import { Button, Snackbar, Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography, FontFamily, Radii } from "../../lib/typography";
import { openLink } from "../../lib/open-link";
import { logGiftImageOutcome } from "../../lib/gift-image-telemetry";
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

// The reserved square the image renders into. Kept stable while the bitmap
// loads so the card can't jump after open (DEV-185).
const IMAGE_BOX = 200;

// Usable-size floor. The old gate rejected anything under 200px, which silently
// dropped plenty of legitimate product images; this only filters obvious
// non-product assets (tracking pixels, favicons, tiny thumbs).
const MIN_IMAGE_SIZE = 64;

// iOS App Transport Security refuses to load plaintext `http://` images, so a
// product image served insecurely fires onError and the card hides it. Upgrade
// the scheme to `https` so the ATS-blocked subset renders. Only rewrites the
// bare `http://` prefix; anything else (already https, data:, relative) passes
// through untouched.
const toSecureImageUrl = (url: string) =>
  url.startsWith("http://") ? `https://${url.slice("http://".length)}` : url;

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
  // for missing / too-small / broken images. The transition out of `pending`
  // is driven by the real <Image> onLoad/onError below, not a separate
  // Image.getSize probe: the probe was a second network request that failed
  // independently of the actual render (hotlink blocks, redirects), silently
  // hiding images that would have displayed fine.
  const [imageState, setImageState] = useState<
    "pending" | "visible" | "hidden"
  >(suggestion.image_url ? "pending" : "hidden");
  const [openFailed, setOpenFailed] = useState(false);
  const logClick = useLogOutboundClick();

  const cardRef = useRef<View>(null);
  const reportedLayout = useRef(false);

  // Reset the image lifecycle when the card is reused for a different
  // suggestion. A missing url is a terminal outcome we log here; present urls
  // resolve via onLoad/onError.
  useEffect(() => {
    if (!suggestion.image_url) {
      setImageState("hidden");
      logGiftImageOutcome({ suggestion, outcome: "no_image_url" });
      return;
    }
    setImageState("pending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion.id, suggestion.image_url]);

  const handleImageLoad = (e: NativeSyntheticEvent<ImageLoadEventData>) => {
    const source = e.nativeEvent?.source;
    const width = source?.width;
    const height = source?.height;
    // Only reject on a confident measurement; if the platform doesn't report
    // dimensions, show the image rather than hide it on a guess.
    const tooSmall =
      typeof width === "number" &&
      typeof height === "number" &&
      width > 0 &&
      height > 0 &&
      (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE);
    setImageState(tooSmall ? "hidden" : "visible");
    logGiftImageOutcome({
      suggestion,
      outcome: tooSmall ? "too_small" : "loaded",
      width,
      height,
    });
  };

  const handleImageError = (e: NativeSyntheticEvent<ImageErrorEventData>) => {
    setImageState("hidden");
    logGiftImageOutcome({
      suggestion,
      outcome: "load_error",
      error: e.nativeEvent?.error
        ? String(e.nativeEvent.error)
        : "unknown error",
    });
  };

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
            {/* Mounted while `pending` so onLoad/onError can fire, but kept
                invisible until validated so a too-small image never flashes
                before it collapses. */}
            <Image
              source={{ uri: toSecureImageUrl(suggestion.image_url) }}
              style={[
                styles.image,
                imageState !== "visible" && styles.imageLoading,
              ]}
              resizeMode="contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </View>
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {suggestion.title}
          </Text>
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
    width: IMAGE_BOX,
    height: IMAGE_BOX,
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
  imageLoading: {
    opacity: 0,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
    // Reserve clearance for the expand chevron, which floats over the card's
    // top-right (expandButton: right 13 + 24pt glyph = 37pt from the card edge,
    // vs the 23pt content inset). Without it a long AI title's first line runs
    // under the chevron. paddingRight = (37 - 23) + breathing room.
    paddingRight: 24,
  },
  price: {
    ...Typography.largeCta,
    color: Colors.brand.gold,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaLabel: {
    ...Typography.largeCta,
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
    // eslint-disable-next-line no-restricted-syntax -- DM Sans size the type scale doesn't define
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  whyBody: {
    fontFamily: FontFamily.sans.regular,
    color: Colors.darks.black,
    // Figma (4170:15802) sets the body at 14 with a 12px leading, which would
    // overlap 14px glyphs in RN; 18 matches the frame's rendered spacing and
    // the largeCta leading.
    // eslint-disable-next-line no-restricted-syntax -- DM Sans size the type scale doesn't define
    fontSize: 14,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
});
