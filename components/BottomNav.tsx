import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { Link, usePathname } from "expo-router";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";

// Glyphs are matched to the "Footer Navigation" design frame: an outlined house
// (only in MaterialCommunityIcons), a filled group, and a dotted month calendar.
type NavItem = {
  key: "dashboard" | "people" | "moments";
  label: string;
  href: "/dashboard" | "/contacts" | "/calendar";
} & (
  | { iconSet: "community"; icon: keyof typeof MaterialCommunityIcons.glyphMap }
  | { iconSet: "material"; icon: keyof typeof MaterialIcons.glyphMap }
);

/** Height of the nav's content row (excludes the safe-area inset added below
 * it). Exported so overlays like the Past Gifts drawer can pin flush above the
 * nav: their bottom offset is this plus the same safe-area inset. */
export const NAV_CONTENT_HEIGHT = 55;

const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Home",
    iconSet: "community",
    icon: "home-outline",
    href: "/dashboard",
  },
  {
    key: "people",
    label: "People",
    iconSet: "material",
    icon: "people",
    href: "/contacts",
  },
  {
    key: "moments",
    label: "Moments",
    iconSet: "material",
    icon: "calendar-month",
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
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={styles.navContent}>
          {NAV_ITEMS.map((item) => {
            const isActive = isRouteActive(item, pathname);
            const tint = isActive ? Colors.blues.dark : Colors.white;
            return (
              <Link key={item.key} href={item.href} asChild>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={styles.navItem}
                >
                  {item.iconSet === "community" ? (
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={24}
                      color={tint}
                    />
                  ) : (
                    <MaterialIcons name={item.icon} size={24} color={tint} />
                  )}
                  <Text
                    variant="labelSmall"
                    style={[styles.label, { color: tint }]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
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
  },
  navContent: {
    // Content row that can grow taller so a label scaled up at large Dynamic
    // Type isn't clipped; the safe-area inset is applied separately as additive
    // paddingBottom on the container so it never crushes this row.
    minHeight: NAV_CONTENT_HEIGHT,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "stretch",
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
