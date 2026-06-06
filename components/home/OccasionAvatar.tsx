import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { FontFamily } from "../../lib/typography";

type OccasionAvatarProps = {
  name: string;
  size: number;
};

/**
 * Circular initials avatar for the home cards (Figma "User" component).
 * White fill + dark-teal initials reads on the dark-teal hero, medium-teal,
 * and gold card backgrounds. Occasion data carries no photo, so this is
 * always the initials fallback.
 */
export default function OccasionAvatar({ name, size }: OccasionAvatarProps) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
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
