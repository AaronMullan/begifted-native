import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { Link, usePathname } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";

// Glyphs are matched to the "Footer Navigation" design frame: an outlined house,
// a filled group (front figure + one behind), and an outlined month calendar.
// All three are MaterialCommunityIcons — MaterialIcons "group"/"people" render
// as two equal figures and its "calendar-month" is filled, neither matching the
// frame.
type NavItem = {
  key: "dashboard" | "people" | "moments";
  label: string;
  href: "/dashboard" | "/contacts" | "/calendar";
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

/** Base height of the nav bar, excluding the home-indicator safe-area inset.
 * Total nav height = this + the bottom inset; the icons are centered within
 * that total (see the container style). Exported so overlays like the Past
 * Gifts drawer can pin flush above the nav: their bottom offset is this plus
 * the same safe-area inset. */
export const NAV_CONTENT_HEIGHT = 55;

const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Home",
    icon: "home-outline",
    href: "/dashboard",
  },
  {
    key: "people",
    label: "People",
    icon: "account-multiple",
    href: "/contacts",
  },
  {
    key: "moments",
    label: "Moments",
    icon: "calendar-month-outline",
    href: "/calendar",
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Hide on admin, onboarding, and pre-auth intro routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/intro")
  ) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <View
        style={[
          styles.container,
          // Reserve the home-indicator safe area as part of the bar's total
          // height (rather than as bottom padding) so the icons center in the
          // whole teal band instead of sitting in the top NAV_CONTENT_HEIGHT
          // with the inset pooled as empty space below — while still clearing
          // the home-indicator pill.
          { minHeight: NAV_CONTENT_HEIGHT + Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={styles.navContent}>
          {NAV_ITEMS.map((item) => {
            const isActive = isRouteActive(item, pathname);
            const tint = isActive ? Colors.blues.dark : Colors.white;
            return (
              <Link key={item.key} href={item.href} asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={styles.navItem}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={24}
                    color={tint}
                  />
                  <Text
                    variant="labelSmall"
                    style={[styles.label, { color: tint }]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function isRouteActive(item: NavItem, pathname: string) {
  if (item.key === "dashboard") {
    // Treat both / and /dashboard as home
    return pathname === "/" || pathname.startsWith("/dashboard");
  }

  if (item.key === "people") {
    return pathname.startsWith("/contacts");
  }

  if (item.key === "moments") {
    return pathname.startsWith("/calendar");
  }

  return false;
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
    backgroundColor: Colors.blues.medium,
    // Center the nav row vertically in the full bar height (base + safe area).
    justifyContent: "center",
  },
  navContent: {
    // The row grows with the content, so a label scaled up at large Dynamic
    // Type isn't clipped; the container's minHeight reserves the base + inset
    // and centers this row within it.
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    ...Typography.navLabel,
    letterSpacing: 0.2,
  },
});
