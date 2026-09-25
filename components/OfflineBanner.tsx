import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkState } from "expo-network";
import { Colors } from "../lib/colors";
import { Spacing } from "../lib/spacing";
import { Typography } from "../lib/typography";
import { StateCopy } from "../lib/state-copy";

/**
 * App-wide notice while the device has no connection. It only informs:
 * TanStack's onlineManager is deliberately left unwired, because with the
 * default `networkMode: "online"` it would pause mutations while offline and
 * leave saves spinning instead of failing with the save-failure message.
 *
 * Only `isConnected === false` counts. Android reports `isInternetReachable`
 * false on working networks whose captive-portal check hasn't passed
 * (firewalls, some VPNs, mid-handover), and the first read before the native
 * module reports is undefined. The delay keeps a Wi-Fi↔cellular handover, or
 * a stale initial read that a listener event corrects, from flashing it.
 */
const SHOW_AFTER_MS = 2000;

const OfflineBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetworkState();
  const disconnected = isConnected === false;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!disconnected) return;
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setShown(false);
    };
  }, [disconnected]);

  if (!shown) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { top: insets.top + Spacing.marginCompact }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{StateCopy.offline}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: Colors.brand.darkTeal,
    borderRadius: 999,
    paddingVertical: Spacing.marginCompact / 2,
    paddingHorizontal: Spacing.screenGutter,
  },
  text: {
    ...Typography.subhead,
    color: Colors.white,
  },
});

export default OfflineBanner;
