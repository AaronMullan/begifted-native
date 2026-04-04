import { View, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { Text } from "react-native-paper";
import { Link, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../lib/colors";
import { useBottomNavVisibility } from "../hooks/use-bottom-nav-visibility";

type NavItem = {
  key: "dashboard" | "contacts" | "calendar" | "settings";
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  href: "/dashboard" | "/contacts" | "/calendar" | "/settings";
};

const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Home",
    icon: "home-filled",
    href: "/dashboard",
  },
  {
    key: "contacts",
    label: "Contacts",
    icon: "people-outline",
    href: "/contacts",
  },
  {
    key: "calendar",
    label: "Calendar",
    icon: "calendar-today",
    href: "/calendar",
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    href: "/settings",
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { animatedStyle } = useBottomNavVisibility();

  // Hide on admin and onboarding routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/onboarding")) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={styles.navContent}>
          {NAV_ITEMS.map((item) => {
            const isActive = isRouteActive(item, pathname);
            return (
              <Link key={item.key} href={item.href} asChild>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={styles.navItem}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={24}
                    color={isActive ? Colors.white : "rgba(255,255,255,0.7)"}
                  />
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.label,
                      {
                        color: isActive
                          ? Colors.white
                          : "rgba(255,255,255,0.7)",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </Link>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

function isRouteActive(item: NavItem, pathname: string) {
  if (item.key === "dashboard") {
    // Treat both / and /dashboard as home
    return pathname === "/" || pathname.startsWith("/dashboard");
  }

  if (item.key === "contacts") {
    return pathname.startsWith("/contacts");
  }

  if (item.key === "calendar") {
    return pathname.startsWith("/calendar");
  }

  if (item.key === "settings") {
    return pathname.startsWith("/settings");
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
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
    backgroundColor: Colors.blues.dark,
  },
  navContent: {
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
    paddingVertical: 4,
    gap: 2,
  },
  label: {
    letterSpacing: 0.2,
  },
});
