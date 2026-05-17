import { useState } from "react";
import { View, StyleSheet, Text, Pressable, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Portal } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Link, useRouter, usePathname } from "expo-router";
import { useAuth } from "../hooks/use-auth";
import { useUnreadCount } from "../hooks/use-notifications";
import { useHeaderVisibility } from "../hooks/use-header-visibility";
import { Colors } from "../lib/colors";
import { supabase } from "../lib/supabase";
import BrandMark from "./BrandMark";
import BrandWordmark from "./BrandWordmark";

type HeaderProps = {
  colorful?: boolean;
};

export default function Header({ colorful: _colorful = false }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount();
  const headerHeight = insets.top + 4 + 40 + 8;
  const { animatedStyle } = useHeaderVisibility(headerHeight);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  if (pathname.startsWith("/onboarding") || pathname.startsWith("/intro")) {
    return null;
  }

  async function handleSignOut() {
    setAccountMenuOpen(false);
    await supabase.auth.signOut();
  }

  function handleOpenSettings() {
    setAccountMenuOpen(false);
    router.push("/settings");
  }

  const email = user?.email ?? "";
  const initials =
    email && email.includes("@")
      ? email
          .split("@")[0]
          .split(/[.\s_-]/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("") || "U"
      : "U";

  return (
    <Animated.View
      style={[
        styles.headerBackground,
        { paddingTop: insets.top + 4, backgroundColor: "transparent" },
        animatedStyle,
      ]}
    >
      <View style={styles.headerContent}>
        <Link href="/dashboard" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Begifted home"
            style={styles.brandRow}
          >
            <BrandMark size={BRAND_MARK_SIZE} />
            <BrandWordmark height={16} />
          </Pressable>
        </Link>
        <View style={styles.rightSection}>
          <Link href="/notifications" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Notifications${
                unreadCount > 0 ? `, ${unreadCount} unread` : ""
              }`}
              style={styles.bellButton}
            >
              <MaterialIcons
                name="notifications"
                size={24}
                color={Colors.darks.black}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </Link>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open account menu"
            style={styles.avatarButton}
            onPress={() => setAccountMenuOpen(true)}
          >
            <Avatar.Text
              size={36}
              label={initials}
              style={styles.avatar}
              color={Colors.darks.black}
              labelStyle={styles.avatarLabel}
            />
          </Pressable>
        </View>
      </View>

      {accountMenuOpen ? (
        <Portal>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setAccountMenuOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close account menu"
          />
          <View
            style={[styles.dropdown, { top: insets.top + 56, right: 20 }]}
            pointerEvents="box-none"
          >
            <Pressable
              style={styles.dropdownItem}
              onPress={handleOpenSettings}
              accessibilityRole="button"
            >
              <MaterialIcons
                name="settings"
                size={18}
                color={Colors.darks.black}
              />
              <Text style={styles.dropdownItemText}>Settings</Text>
            </Pressable>
            <View style={styles.dropdownDivider} />
            <Pressable
              style={styles.dropdownItem}
              onPress={handleSignOut}
              accessibilityRole="button"
            >
              <MaterialIcons
                name="logout"
                size={18}
                color={Colors.darks.black}
              />
              <Text style={styles.dropdownItemText}>Sign out</Text>
            </Pressable>
          </View>
        </Portal>
      ) : null}
    </Animated.View>
  );
}

const BRAND_MARK_SIZE = 36;

const styles = StyleSheet.create({
  headerBackground: {
    width: "100%",
    paddingBottom: 8,
  },
  headerContent: {
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  bellButton: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.pinks.dark,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  avatarButton: {
    marginLeft: 12,
  },
  avatar: {
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
  },
  avatarLabel: {
    fontWeight: "600",
    fontSize: 13,
  },
  dropdown: {
    position: "absolute",
    minWidth: 180,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    color: Colors.darks.black,
    fontSize: 15,
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: 8,
  },
});
