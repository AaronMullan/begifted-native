import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Animated, { FadeIn } from "react-native-reanimated";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";
import BrandMark from "./BrandMark";
import BrandWordmark from "./BrandWordmark";

type ProfileReadyInterstitialProps = {
  /** e.g. "Michelle's profile is ready" / "Your profile is ready". */
  title: string;
  subtitle: string;
  /** Fired once after the dwell — the interstitial auto-advances, no CTA. */
  onDone: () => void;
  dwellMs?: number;
};

/**
 * "Profile is ready" transition (Figma 5051:7621 / 5110:4046): centered
 * brand lockup, headline, one-line reassurance. A transition, not a stop —
 * it advances by itself.
 */
export const ProfileReadyInterstitial: React.FC<
  ProfileReadyInterstitialProps
> = ({ title, subtitle, onDone, dwellMs = 2600 }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, dwellMs);
    return () => clearTimeout(timer);
  }, [onDone, dwellMs]);

  return (
    <Animated.View entering={FadeIn.duration(350)} style={styles.container}>
      <View style={styles.logoRow}>
        <BrandMark size={48} />
        <BrandWordmark height={18} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Animated.View>
  );
};

// Frame geometry (874pt frame): lockup at 119, headline at ~350 (40%),
// 24pt gap to the subhead. The headline offset is derived from the logo
// block rather than hardcoding the absolute y.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 21,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 119,
  },
  textBlock: {
    marginTop: 127,
    gap: 24,
    alignItems: "center",
  },
  title: {
    ...Typography.h1,
    color: Colors.brand.darkTeal,
    textAlign: "center",
    maxWidth: 360,
  },
  subtitle: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
    textAlign: "center",
    maxWidth: 320,
  },
});
