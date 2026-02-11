import { View, StyleSheet, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "react-native-paper";
import { Link } from "expo-router";
import { useAuth } from "../hooks/use-auth";

type HeaderProps = {
  colorful?: boolean;
};

export default function Header({ colorful: _colorful = false }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

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
      {/* Contained content at max 800px to match dashboard */}
      <View style={styles.headerContent}>
        <Link href="/dashboard" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Begifted home"
          >
            <Text style={styles.logoText}>BEGIFTED</Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={styles.avatarButton}
          >
            <Avatar.Text
              size={32}
              label={initials}
              style={styles.avatar}
              color="#FFFFFF"
            />
          </Pressable>
        </Link>
      </View>
    </View>
  );
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
  avatarButton: {
    marginLeft: 12,
  },
  logoText: {
    fontFamily: "AzeretMono_400Regular",
    fontSize: 18,
    fontWeight: "400",
    color: "#000000",
    letterSpacing: 0.5,
  },
  avatar: {
    backgroundColor: "#000000",
  },
});
