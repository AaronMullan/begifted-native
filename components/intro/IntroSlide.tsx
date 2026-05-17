import type { ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandMark from "../BrandMark";
import BrandWordmark from "../BrandWordmark";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";

type IntroSlideProps = {
  headline?: string;
  /**
   * Where the headline sits relative to the image:
   *   "above" — headline above the imagery (slides 1, 3)
   *   "below" — headline below the imagery (slide 2)
   */
  headlineLayout?: "above" | "below";
  imageSlot?: ReactNode;
  footerSlot: ReactNode;
};

export default function IntroSlide({
  headline,
  headlineLayout = "above",
  imageSlot,
  footerSlot,
}: IntroSlideProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const headlineEl = headline ? (
    <Text style={[Typography.h1, styles.headline]}>{headline}</Text>
  ) : null;

  return (
    <View style={[styles.slide, { width, height }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BrandMark size={28} />
        <BrandWordmark height={12} color={Colors.darks.black} />
      </View>

      <View style={styles.body}>
        {headlineLayout === "above" ? (
          <>
            {headlineEl}
            {imageSlot ? (
              <View style={styles.imageWrap}>{imageSlot}</View>
            ) : null}
          </>
        ) : (
          <>
            {imageSlot ? (
              <View style={styles.imageWrap}>{imageSlot}</View>
            ) : null}
            {headlineEl}
          </>
        )}
      </View>

      <View>{footerSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 32,
  },
  headline: {
    color: Colors.brand.darkTeal,
  },
  imageWrap: {
    width: "100%",
  },
});
