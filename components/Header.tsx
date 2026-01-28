import { View, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HamburgerMenu from "./HamburgerMenu";

type HeaderProps = {
  colorful?: boolean;
};

export default function Header({ colorful = false }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.headerBackground,
        { paddingTop: insets.top + 4, backgroundColor: "transparent" },
      ]}
    >
      {/* Contained content at max 800px to match dashboard */}
      <View style={styles.headerContent}>
        <HamburgerMenu />
        <Text style={styles.logoText}>BEGIFTED</Text>
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
  logoText: {
    fontFamily: "AzeretMono_400Regular",
    fontSize: 18,
    fontWeight: "400",
    color: "#000000",
    letterSpacing: 0.5,
  },
});
