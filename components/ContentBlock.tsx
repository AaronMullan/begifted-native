import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import Auth from "./Auth";
import { useResponsive } from "../hooks/use-responsive";
import { colors, fonts, spacing, buttonStyles } from "../constants/theme";

export default function ContentBlock() {
  const { isDesktop, isTablet } = useResponsive();
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
    backgroundColor: colors.darkTeal,
    paddingBottom: spacing.padding.xxxl,
    paddingTop: spacing.padding.xxxl,
  },
  contentWrapper: {
    maxWidth: spacing.contentMaxWidth,
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
    gap: spacing.padding.xxl,
  },
  heading: {
    fontFamily: fonts.body,
    color: colors.white,
    marginBottom: spacing.margin.sm,
    textAlign: "left",
    width: "100%",
  },
  body: {
    fontFamily: fonts.body,
    color: colors.white,
    textAlign: "left",
    marginBottom: spacing.margin.xl,
  },
  button: {
    backgroundColor: buttonStyles.primary.backgroundColor,
    paddingHorizontal: buttonStyles.primary.paddingHorizontal,
    paddingVertical: buttonStyles.primary.paddingVertical,
    marginBottom: spacing.margin.xl,
    alignSelf: "flex-start",
  },
  buttonText: {
    color: buttonStyles.primary.color,
    fontSize: buttonStyles.primary.fontSize,
    fontWeight: buttonStyles.primary.fontWeight,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalContent: {
    padding: spacing.margin.xl,
  },
  closeButton: {
    alignSelf: "flex-end",
    marginBottom: spacing.margin.xl,
  },
  closeButtonText: {
    fontSize: 18,
    color: "#007AFF",
  },
});
