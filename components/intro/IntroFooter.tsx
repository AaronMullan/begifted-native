import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";

type IntroFooterProps = {
  totalSlides: number;
  currentIndex: number;
  onSkip?: () => void;
  onNext?: () => void;
  showSkip?: boolean;
  showNext?: boolean;
};

export default function IntroFooter({
  totalSlides,
  currentIndex,
  onSkip,
  onNext,
  showSkip = true,
  showNext = true,
}: IntroFooterProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {showSkip && onSkip ? (
          <Pressable
            onPress={onSkip}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={[Typography.smallCta, styles.label]}>SKIP</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.dots}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      <View style={[styles.side, styles.sideRight]}>
        {showNext && onNext ? (
          <Pressable
            onPress={onNext}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Next slide"
          >
            <Text style={[Typography.smallCta, styles.label]}>NEXT</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.brand.buttonTeal,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  side: {
    minWidth: 48,
    alignItems: "flex-start",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  label: {
    color: Colors.white,
    letterSpacing: 1.2,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    backgroundColor: Colors.yellows.orange,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
