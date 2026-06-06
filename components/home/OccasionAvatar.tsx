import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Image } from "expo-image";
import { Colors } from "../../lib/colors";
import { FontFamily } from "../../lib/typography";

type OccasionAvatarProps = {
  name: string;
  size: number;
  photoUrl?: string | null;
};

/**
 * Circular avatar for the home cards (Figma "User" component). Shows the
 * recipient photo when available; otherwise a white circle + dark-teal initials,
 * which reads on the dark-teal hero, medium-teal, and gold card backgrounds.
 */
export default function OccasionAvatar({
  name,
  size,
  photoUrl,
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
    <View style={[styles.circle, dimensions]}>
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.4) }]}>
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
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: FontFamily.sans.semibold,
    color: Colors.brand.darkTeal,
  },
});
