import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { Link, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../lib/colors";

type NavItem = {
  key: "dashboard" | "people" | "moments";
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  href: "/dashboard" | "/contacts" | "/calendar";
};

const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Home",
    icon: "home-filled",
    href: "/dashboard",
  },
  {
    key: "people",
    label: "People",
    icon: "people-outline",
    href: "/contacts",
  },
  {
    key: "moments",
    label: "Moments",
    icon: "event-note",
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
                  <MaterialIcons name={item.icon} size={24} color={tint} />
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
    // Fixed 55px content row; the safe-area inset is applied separately as
    // additive paddingBottom on the container so it never crushes this row.
    height: 55,
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
    letterSpacing: 0.2,
  },
});
