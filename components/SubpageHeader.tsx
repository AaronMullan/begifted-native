import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";

type SubpageHeaderProps = {
  title: string;
};

// Left gutter shared by the redesigned Settings sub-page frames in the FINAL
// Figma file (chevron/title/content all align to x=32 on the 402pt frame).
// Exported so each screen's content aligns to the same edge as this header.
export const SUBPAGE_GUTTER = 32;

/**
 * Back-chevron + serif title row that opens the redesigned Settings sub-pages
 * (FAQ, Account, Contact Us, …). Renders directly beneath the global app
 * Header — screens give it a small top gap rather than clearing a fixed header
 * height, because the app Header is in normal flow above the routed content.
 */
const SubpageHeader: React.FC<SubpageHeaderProps> = ({ title }) => {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        style={styles.back}
      >
        <MaterialIcons
          name="chevron-left"
          size={26}
          color={Colors.brand.darkTeal}
        />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

export default SubpageHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: SUBPAGE_GUTTER,
  },
  // Pull the chevron's glyph box back so its visual left edge lands on the
  // gutter; hitSlop supplies the 44pt tap target without shifting layout.
  back: {
    marginLeft: -4,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
});
