import {
  View,
  Text,
  Image,
  useWindowDimensions,
  StyleSheet,
} from "react-native";

// Create a mapping object for all logos
const logoImages = {
  "addidas.png": require("../assets/images/logos/addidas.png"),
  "apple.png": require("../assets/images/logos/apple.png"),
  "barnesandnoble.png": require("../assets/images/logos/barnesandnoble.png"),
  "disney.png": require("../assets/images/logos/disney.png"),
  "dollandbranch.png": require("../assets/images/logos/dollandbranch.png"),
  "everlane.png": require("../assets/images/logos/everlane.png"),
  "fi.png": require("../assets/images/logos/fi.png"),
  "hellokitty.png": require("../assets/images/logos/hellokitty.png"),
  "hermes.png": require("../assets/images/logos/hermes.png"),
  "honda.png": require("../assets/images/logos/honda.png"),
  "instyle.png": require("../assets/images/logos/instyle.png"),
  "kindbody.png": require("../assets/images/logos/kindbody.png"),
  "lego.png": require("../assets/images/logos/lego.png"),
  "levis.png": require("../assets/images/logos/levis.png"),
  "nike.png": require("../assets/images/logos/nike.png"),
  "nintendo.png": require("../assets/images/logos/nintendo.png"),
  "palace.png": require("../assets/images/logos/palace.png"),
  "pandora.png": require("../assets/images/logos/pandora.png"),
  "rayban.png": require("../assets/images/logos/rayban.png"),
  "roblox.png": require("../assets/images/logos/roblox.png"),
  "santagloria.png": require("../assets/images/logos/santagloria.png"),
  "uncommongoods.png": require("../assets/images/logos/uncommongoods.png"),
  "yamaha.png": require("../assets/images/logos/yamaha.png"),
};

const brandLogos = [
  "addidas.png",
  "apple.png",
  "barnesandnoble.png",
  "disney.png",
  "dollandbranch.png",
  "everlane.png",
  "fi.png",
  "hellokitty.png",
  "hermes.png",
  "honda.png",
  "instyle.png",
  "kindbody.png",
  "lego.png",
  "levis.png",
  "nike.png",
  "nintendo.png",
  "palace.png",
  "pandora.png",
  "rayban.png",
  "roblox.png",
  "santagloria.png",
  "uncommongoods.png",
  "yamaha.png",
];

export default function BrandGrid() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  const fontSize = {
    heading: isDesktop ? 24 : isTablet ? 20 : 18,
  };

  // Create grid rows with alternating item counts
  const createGridRows = () => {
    const rows = [];
    let currentIndex = 0;
    let rowIndex = 0;

    while (currentIndex < brandLogos.length) {
      const itemsPerRow = rowIndex % 2 === 0 ? 4 : 5; // Even rows: 4, Odd rows: 5
      const rowItems = brandLogos.slice(
        currentIndex,
        currentIndex + itemsPerRow
      );

      rows.push(
        <View key={rowIndex} style={styles.gridRow}>
          {rowItems.map((logo, index) => (
            <View key={currentIndex + index} style={styles.gridItem}>
              <Image
                source={logoImages[logo as keyof typeof logoImages]}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </View>
      );

      currentIndex += itemsPerRow;
      rowIndex++;
    }

    return rows;
  };

  return (
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#BB693E",
        padding: 20,
      }}
    >
      <Text
        style={{
          fontFamily: "RobotoFlex_400Regular",
          fontSize: fontSize.heading,
          color: "#fff",
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        Featuring brands and stores such as:
      </Text>
      <View style={styles.gridContainer}>{createGridRows()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    width: "100%",
    maxWidth: 800,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
});
