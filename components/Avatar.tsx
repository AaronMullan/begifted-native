import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Image } from "expo-image";
import { Colors } from "../lib/colors";
import { FontFamily } from "../lib/typography";

/**
 * Where the avatar renders, which fixes its colors (per-context spec):
 * - "header" — white circle / dark-teal initials: the upper-right user
 *   identity (Header) and the settings profile photo.
 * - "homeCard" — white circle / gold initials: Home Large and Medium modules.
 *   The Next Up Teal/Rose/Gold rotation applies to the card background only,
 *   never to the avatar circle.
 * - "list" — medium-teal circle / white initials: People list rows and any
 *   module on a white background.
 */
export type AvatarContext = "header" | "homeCard" | "list";

const CONTEXT_COLORS: Record<
  AvatarContext,
  { circle: string; initials: string }
> = {
  header: { circle: Colors.white, initials: Colors.brand.darkTeal },
  homeCard: { circle: Colors.white, initials: Colors.brand.gold },
  list: { circle: Colors.brand.mediumTeal, initials: Colors.white },
};

type AvatarProps = {
  name: string;
  size: number;
  context: AvatarContext;
  photoUrl?: string | null;
  /**
   * Precomputed initials override — the user-identity contexts derive theirs
   * with an email fallback (see deriveUserInitials). Defaults to initials
   * taken from `name`.
   */
  initials?: string;
};

export default function Avatar({
  name,
  size,
  context,
  photoUrl,
  initials,
}: AvatarProps) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };
  // A white circle disappears against the beige header/settings backgrounds,
  // so the header context keeps a hairline outline on both photo and fallback.
  const outline = context === "header" && styles.outlined;

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[dimensions, outline]}
        contentFit="cover"
        accessibilityLabel={`${name} photo`}
      />
    );
  }

  const colors = CONTEXT_COLORS[context];
  return (
    <View
      style={[
        styles.circle,
        dimensions,
        outline,
        { backgroundColor: colors.circle },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize: Math.round(size * 0.4), color: colors.initials },
        ]}
      >
        {initials ?? getInitials(name)}
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

/**
 * Initials for the signed-in user's own avatar. Prefers the profile name
 * (first letter of the first two tokens); falls back to the email local part
 * ("aaron.mullan@…" → "AM"), then "U" when nothing is available.
 */
export function deriveUserInitials(fullName: string, email: string): string {
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
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  outlined: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
  },
  initials: {
    fontFamily: FontFamily.sans.semibold,
  },
});
