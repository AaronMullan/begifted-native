import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Link, usePathname } from "expo-router";
import { useAuth } from "../hooks/use-auth";
import { useProfile } from "../hooks/use-profile";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";
import { openBugReport } from "../lib/feedback";
import { interceptLeave } from "../lib/leave-guard";
import Avatar, { deriveUserInitials } from "./Avatar";
import BrandMark from "./BrandMark";
import BrandWordmark from "./BrandWordmark";
import { INVITE_PATH } from "./open/InviteLinkPreview";

type HeaderProps = {
  colorful?: boolean;
};

export default function Header({ colorful: _colorful = false }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  if (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/intro") ||
    pathname === INVITE_PATH
  ) {
    return null;
  }

  const fullName = profile?.full_name ?? "";
  const initials = deriveUserInitials(fullName, user?.email ?? "");

  return (
    <View
      style={[
        styles.headerBackground,
        { paddingTop: insets.top + 4, backgroundColor: "transparent" },
      ]}
    >
      <View style={styles.headerContent}>
        <Link
          href="/dashboard"
          asChild
          onPress={(e) => {
            if (interceptLeave("/dashboard")) e.preventDefault();
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Begifted home"
            style={styles.brandRow}
          >
            <BrandMark size={BRAND_MARK_SIZE} />
            <BrandWordmark height={16} />
            <View style={styles.betaBadge}>
              <Text style={[Typography.smallCta, styles.betaBadgeText]}>
                BETA
              </Text>
            </View>
          </Pressable>
        </Link>
        <View style={styles.rightSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report a bug"
            style={styles.bugButton}
            onPress={() => openBugReport("header")}
          >
            <MaterialIcons name="bug-report" size={24} color={Colors.black} />
          </Pressable>
          <Link
            href="/settings"
            asChild
            onPress={(e) => {
              if (interceptLeave("/settings")) e.preventDefault();
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              style={styles.avatarButton}
            >
              <Avatar
                name={fullName}
                size={36}
                context="header"
                photoUrl={profile?.avatar_url}
                initials={initials}
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
  betaBadge: {
    height: 22,
    paddingHorizontal: 10,
    borderRadius: 11,
    justifyContent: "center",
    backgroundColor: Colors.brand.betaBadge,
    marginLeft: 2,
  },
  betaBadgeText: {
    letterSpacing: 0.6,
    color: Colors.white,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  // 44x44 transparent hit area meets Apple's HIG minimum without resizing the
  // 24pt icon. hitSlop can't be used here: RN clips a touch area to the parent
  // row, which is only as tall as the icon, so the target must own real size.
  bugButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarButton: {
    marginLeft: 12,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
