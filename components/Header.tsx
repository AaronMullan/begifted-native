import { View, StyleSheet, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Link, usePathname } from "expo-router";
import { useAuth } from "../hooks/use-auth";
import { useUnreadCount } from "../hooks/use-notifications";
import { Colors } from "../lib/colors";
import BrandMark from "./BrandMark";
import BrandWordmark from "./BrandWordmark";

type HeaderProps = {
  colorful?: boolean;
};

export default function Header({ colorful: _colorful = false }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount();

  if (pathname.startsWith("/onboarding") || pathname.startsWith("/intro")) {
    return null;
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
    <View
      style={[
        styles.headerBackground,
        { paddingTop: insets.top + 4, backgroundColor: "transparent" },
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
          <Link href="/settings" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              style={styles.avatarButton}
            >
              <Avatar.Text
                size={36}
                label={initials}
                style={styles.avatar}
                color={Colors.darks.black}
                labelStyle={styles.avatarLabel}
              />
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
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
});
