import { View, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HamburgerMenu from "./HamburgerMenu";
import { useWindowDimensions } from "react-native";

export default function Header() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  // Add padding until we reach the max-width
  const getPadding = () => {
    if (width >= 1240) return 0; // Full width, content is at max-width
    if (width >= 1024) return 40; // Desktop but below max-width
    if (width >= 768) return 40; // Tablet
    return 20; // Mobile
  };

  return (
    <View style={[styles.headerBackground, { paddingTop: insets.top + 10 }]}>
      {/* Contained content at max 1200px */}
      <View style={[styles.headerContent, { paddingHorizontal: getPadding() }]}>
        <Image
          source={require("../assets/images/begifted-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <HamburgerMenu />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    width: "100%",
    backgroundColor: "#52A78B",
    paddingBottom: 80,
  },
  headerContent: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    // height: 40,
  },
});
