import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Button } from "react-native-paper";
import { Colors } from "@/lib/colors";
import { Typography } from "@/lib/typography";

export type PrimaryCtaState = "idle" | "loading" | "success";

type PrimaryCtaProps = {
  label: string;
  onPress: () => void;
  state?: PrimaryCtaState;
  // Text shown (with a leading check) while state is "success".
  successLabel?: string;
  disabled?: boolean;
  // Spec: hug-width + centered in drawers/conversational flows; full-width
  // only on dedicated edit screens.
  fullWidth?: boolean;
  variant?: "filled" | "outline";
  style?: StyleProp<ViewStyle>;
};

// Figma "Button / Primary CTA" (node 4560:4314): 170×46 pill, radius 24,
// 40px horizontal padding, largeCta text. States — Default darkTeal/white,
// Outline 2px darkTeal border, Disabled lightTeal/white, Loading lightTeal
// with three 6px white dots, Success mediumTeal "✓ …".
const DOT_COUNT = 3;

const LoadingDots: React.FC = () => {
  const [opacities] = useState(() =>
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.4))
  );

  useEffect(() => {
    const loops = opacities.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.4,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [opacities]);

  return (
    <View pointerEvents="none" style={styles.dotsOverlay}>
      {opacities.map((value, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: value }]} />
      ))}
    </View>
  );
};

export const PrimaryCta: React.FC<PrimaryCtaProps> = ({
  label,
  onPress,
  state = "idle",
  successLabel = "Saved",
  disabled = false,
  fullWidth = false,
  variant = "filled",
  style,
}) => {
  const interactive = state === "idle" && !disabled;
  const outline = variant === "outline";

  const backgroundColor = outline
    ? "transparent"
    : state === "success"
      ? Colors.brand.mediumTeal
      : state === "loading" || disabled
        ? Colors.brand.lightTeal
        : Colors.brand.darkTeal;
  const textColor = outline ? Colors.brand.darkTeal : Colors.white;

  return (
    <View style={[fullWidth ? styles.stretch : styles.hug, style]}>
      <Button
        mode={outline ? "outlined" : "contained"}
        buttonColor={backgroundColor}
        textColor={textColor}
        onPress={interactive ? onPress : undefined}
        style={[styles.button, outline && styles.outline]}
        contentStyle={styles.content}
        labelStyle={[
          styles.label,
          { color: textColor },
          // Keep the pill's hug width stable while the dots overlay shows.
          state === "loading" && styles.labelHidden,
        ]}
        accessibilityState={{
          disabled: !interactive,
          busy: state === "loading",
        }}
      >
        {state === "success" ? `✓ ${successLabel}` : label}
      </Button>
      {state === "loading" && <LoadingDots />}
    </View>
  );
};

const styles = StyleSheet.create({
  hug: {
    alignSelf: "center",
  },
  stretch: {
    alignSelf: "stretch",
  },
  button: {
    borderRadius: 24,
    minWidth: 170,
  },
  outline: {
    borderWidth: 2,
    borderColor: Colors.brand.darkTeal,
  },
  content: {
    height: 46,
    paddingHorizontal: 40,
  },
  label: {
    ...Typography.largeCta,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  labelHidden: {
    opacity: 0,
  },
  dotsOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
  },
});
