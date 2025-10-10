import {
  View,
  Text,
  Image,
  useWindowDimensions,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
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

          <TouchableOpacity
            style={styles.button}
            onPress={() => setAuthModalVisible(true)}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAuthModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
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
    backgroundColor: "#231F20",
    paddingHorizontal: 30,
    paddingVertical: 15,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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
  closeButtonText: {
    fontSize: 18,
    color: "#007AFF",
  },
});
