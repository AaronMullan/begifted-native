import { View, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HamburgerMenu from "./HamburgerMenu";

type HeaderProps = {
  colorful?: boolean;
};

export default function Header({ colorful = false }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const headerBackgroundColor = colorful ? "#52A78B" : "#000000";

  return (
    <View
      style={[
        styles.headerBackground,
        { paddingTop: insets.top + 8, backgroundColor: headerBackgroundColor },
      ]}
    >
      {/* Contained content at max 800px to match dashboard */}
      <View style={styles.headerContent}>
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
    paddingBottom: 16,
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
  logo: {
    // height: 40,
  },
});
