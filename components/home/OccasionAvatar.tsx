import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Image } from "expo-image";
import { Colors } from "../../lib/colors";
import { FontFamily } from "../../lib/typography";

type OccasionAvatarProps = {
  name: string;
  size: number;
  photoUrl?: string | null;
  /** Initials-fallback circle fill. Defaults to white (reads on dark cards). */
  circleColor?: string;
  /** Initials-fallback text color. Defaults to dark teal. */
  initialsColor?: string;
};

/**
 * Circular avatar for the home cards (Figma "User" component). Shows the
 * recipient photo when available; otherwise an initials fallback. The hero
 * (dark card) uses a white circle + dark-teal initials; the NEXT UP cards use
 * a teal circle + white initials, matching the Figma "BT" avatar.
 */
export default function OccasionAvatar({
  name,
  size,
  photoUrl,
  circleColor = Colors.white,
  initialsColor = Colors.brand.darkTeal,
}: OccasionAvatarProps) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={dimensions}
        contentFit="cover"
        accessibilityLabel={`${name} photo`}
      />
    );
  }

  return (
    <View style={[styles.circle, dimensions, { backgroundColor: circleColor }]}>
      <Text
        style={[
          styles.initials,
          { fontSize: Math.round(size * 0.4), color: initialsColor },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return Array.from(parts[0])[0]?.toUpperCase() ?? "?";
  }
  const first = Array.from(parts[0])[0] ?? "";
  const last = Array.from(parts[parts.length - 1])[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: FontFamily.sans.semibold,
  },
});
