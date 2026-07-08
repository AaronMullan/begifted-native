import { useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandMark from "../BrandMark";
import BrandWordmark from "../BrandWordmark";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";

const SLIDE_IMAGES = {
  slide1Left: require("../../assets/images/intro/slide-1-left.jpg"),
  slide1Right: require("../../assets/images/intro/slide-1-right.jpg"),
  slide2Left: require("../../assets/images/intro/slide-2-left.jpg"),
  slide2Right: require("../../assets/images/intro/slide-2-right.jpg"),
  slide3: require("../../assets/images/intro/slide-3.jpg"),
};

type SlideId = "people" | "thoughtful" | "details";

const SLIDES: { id: SlideId }[] = [
  { id: "people" },
  { id: "thoughtful" },
  { id: "details" },
];

type IntroSwiperProps = {
  onSignUp: () => void;
};

export default function IntroSwiper({ onSignUp }: IntroSwiperProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={SLIDES}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width, height }]}>
            {renderSlide(item.id, insets.top + 64)}
          </View>
        )}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        bounces={false}
      />

      {/* Persistent brand chrome — shown on every slide */}
      <View
        style={[styles.brandRow, { paddingTop: insets.top + 12 }]}
        pointerEvents="none"
      >
        <BrandMark size={28} />
        <BrandWordmark height={13} color={Colors.brand.darkTeal} />
      </View>

      {/* Pinned dots + SIGN ME UP! CTA — persistent on every slide */}
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}
        pointerEvents="box-none"
      >
        <View style={styles.dots} pointerEvents="none">
          {SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                // Inactive dots flip light on the dark full-bleed photo slide
                // so they stay visible against the grass.
                {
                  backgroundColor:
                    SLIDES[index].id === "details"
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(26,68,83,0.25)",
                },
                i === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {index === SLIDES.length - 1 && (
          <Button
            mode="contained"
            onPress={onSignUp}
            buttonColor={Colors.brand.buttonTeal}
            textColor={Colors.white}
            style={styles.cta}
            contentStyle={styles.ctaContent}
            labelStyle={styles.ctaLabel}
          >
            SIGN ME UP!
          </Button>
        )}
      </View>
    </View>
  );
}

function renderSlide(id: SlideId, topOffset: number) {
  if (id === "people") {
    return (
      <View style={styles.body}>
        <Text style={[Typography.h1, styles.headline]}>
          {"Your people.\nTheir moments.\nJust the right gift."}
        </Text>
        <View style={styles.collage}>
          <Image
            source={SLIDE_IMAGES.slide1Left}
            style={styles.collagePhoto}
            resizeMode="cover"
          />
          <View
            style={[styles.stripe, { backgroundColor: Colors.brand.gold }]}
          />
          <Image
            source={SLIDE_IMAGES.slide1Right}
            style={styles.collagePhoto}
            resizeMode="cover"
          />
          <View
            style={[
              styles.stripe,
              { backgroundColor: Colors.brand.mediumTeal },
            ]}
          />
        </View>
      </View>
    );
  }

  if (id === "thoughtful") {
    return (
      <View style={styles.body}>
        <View style={styles.collage}>
          <Image
            source={SLIDE_IMAGES.slide2Left}
            style={styles.collagePhoto}
            resizeMode="cover"
          />
          <View
            style={[styles.divider, { backgroundColor: Colors.brand.darkTeal }]}
          />
          <Image
            source={SLIDE_IMAGES.slide2Right}
            style={styles.collagePhoto}
            resizeMode="cover"
          />
          <View style={styles.stackedStripe}>
            <View style={{ flex: 1, backgroundColor: Colors.brand.rose }} />
            <View style={{ flex: 2, backgroundColor: Colors.brand.gold }} />
          </View>
        </View>
        <Text style={[Typography.h1, styles.headline]}>
          {"Thoughtful\nbeats\nexpensive."}
        </Text>
      </View>
    );
  }

  // details — full-bleed photo with two headline blocks near the top
  return (
    <View style={styles.fullBleedSlide}>
      <Image
        source={SLIDE_IMAGES.slide3}
        style={styles.fullBleed}
        resizeMode="cover"
      />
      <View style={[styles.detailsText, { paddingTop: topOffset }]}>
        <Text style={[Typography.h1, styles.headline]}>
          {"BeGifted pays\nattention to the\ndetails, so you\ndon't have to."}
        </Text>
        <Text style={[Typography.h1, styles.headline, styles.detailsSubhead]}>
          {"Every moment.\nEvery person.\nEvery time."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 36,
  },
  headline: {
    color: Colors.brand.darkTeal,
  },
  collage: {
    flexDirection: "row",
    height: 230,
    borderRadius: Radii.sm,
    overflow: "hidden",
  },
  collagePhoto: {
    flex: 1,
    height: "100%",
  },
  stripe: {
    width: 22,
    height: "100%",
  },
  divider: {
    width: 8,
    height: "100%",
  },
  stackedStripe: {
    width: 22,
    height: "100%",
  },
  fullBleedSlide: {
    flex: 1,
  },
  fullBleed: {
    ...StyleSheet.absoluteFill,
    width: undefined,
    height: undefined,
  },
  detailsText: {
    paddingHorizontal: 28,
    gap: 20,
  },
  detailsSubhead: {
    color: Colors.brand.darkTeal,
  },
  brandRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: Colors.brand.gold,
  },
  cta: {
    alignSelf: "stretch",
    borderRadius: Radii.pill,
  },
  ctaContent: {
    height: 52,
  },
  ctaLabel: {
    ...Typography.largeCta,
    // eslint-disable-next-line no-restricted-syntax -- Figma intro frames set this CTA at 13; no token at that size
    fontSize: 13,
    // largeCta sets lineHeight 12, which clips a 13px glyph — give it room.
    lineHeight: 18,
    letterSpacing: 1.5,
    color: Colors.white,
  },
});
