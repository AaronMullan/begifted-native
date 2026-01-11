import {
  View,
  Image,
  useWindowDimensions,
  Modal,
  StyleSheet,
} from "react-native";
import { Text, Button, IconButton } from "react-native-paper";
import { useState } from "react";
import Auth from "./Auth";

export default function ContentBlock() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const fontSize = {
    heading: isDesktop ? 60 : isTablet ? 20 : 18,
    body: isDesktop ? 24 : isTablet ? 16 : 14,
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.contentWrapper,
          {
            flexDirection: isDesktop ? "row" : "column",
            minHeight: isDesktop ? 400 : 300,
          },
        ]}
      >
        {/* Image content - left side */}
        <View
          style={[
            styles.imageContainer,
            {
              flex: isDesktop ? 1 : undefined,
              width: isDesktop ? "50%" : "100%",
            },
          ]}
        >
          <Image
            source={require("../assets/images/chucklehead.png")}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        {/* Text and button content - right side */}
        <View
          style={[
            styles.textContainer,
            {
              flex: isDesktop ? 1 : undefined,
              paddingLeft: isDesktop ? 80 : 0,
            },
          ]}
        >
          <Text
            variant="headlineMedium"
            style={[
              styles.heading,
              {
                fontSize: fontSize.heading,
              },
            ]}
          >
            The perfect gift—automatically. {"\n"}
            No, really.
          </Text>

          <Text
            variant="bodyLarge"
            style={[
              styles.body,
              {
                fontSize: fontSize.body,
                lineHeight: fontSize.body * 1.5,
              },
            ]}
          >
            Just sign up. We'll take care of the rest. Picked. Purchased. Sent.
            For everyone on your list.
          </Text>

          <Button
            mode="contained"
            onPress={() => setAuthModalVisible(true)}
            style={styles.button}
          >
            Get Started
          </Button>
        </View>
      </View>

      <Modal
        visible={authModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setAuthModalVisible(false)}
              style={styles.closeButton}
            />
            <Auth />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#396D75",
    paddingBottom: 60,
    paddingTop: 60,
  },
  contentWrapper: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  imageContainer: {
    // Dynamic styles applied inline
  },
  image: {
    width: "100%",
    maxHeight: 600,
  },
  textContainer: {
    justifyContent: "space-between",
    gap: 30,
  },
  heading: {
    fontFamily: "RobotoFlex_400Regular",
    color: "#fff",
    marginBottom: 10,
    textAlign: "left",
    width: "100%",
  },
  body: {
    fontFamily: "RobotoFlex_400Regular",
    color: "#fff",
    textAlign: "left",
    marginBottom: 20,
  },
  button: {
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalContent: {
    padding: 20,
  },
  closeButton: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
});
