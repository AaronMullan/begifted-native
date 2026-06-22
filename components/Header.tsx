import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Link, usePathname } from "expo-router";
import { useAuth } from "../hooks/use-auth";
import { useProfile } from "../hooks/use-profile";
import { Colors } from "../lib/colors";
import { openBugReport } from "../lib/feedback";
import BrandMark from "./BrandMark";
import BrandWordmark from "./BrandWordmark";

type HeaderProps = {
  colorful?: boolean;
};

export default function Header({ colorful: _colorful = false }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  if (pathname.startsWith("/onboarding") || pathname.startsWith("/intro")) {
    return null;
  }

  const fullName = profile?.full_name ?? profile?.name ?? "";
  const initials = deriveInitials(fullName, user?.email ?? "");

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report a bug"
            style={styles.bugButton}
            onPress={() => openBugReport("header")}
          >
            <MaterialIcons
              name="bug-report"
              size={24}
              color={Colors.darks.black}
            />
          </Pressable>
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

/**
 * Build the avatar fallback initials. Prefers the user's name (profiles store a
 * single `full_name`), taking the first letter of the first two tokens
 * (e.g. "Caspian Michalowski" → "CM"). Single-token names yield one initial.
 * Falls back to the email local part, then "U" when nothing is available.
 */
function deriveInitials(fullName: string, email: string): string {
  const fromName = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  if (fromName) return fromName;

  if (email.includes("@")) {
    const fromEmail = email
      .split("@")[0]
      .split(/[.\s_-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    if (fromEmail) return fromEmail;
  }

  return "U";
}

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
