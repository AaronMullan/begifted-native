import {
  View,
  Text,
  Image,
  useWindowDimensions,
  TouchableOpacity,
  Modal,
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
    <View
      style={{
        width: "100%",
        backgroundColor: "#396D75",
        paddingBottom: 60,
        paddingTop: 60,
      }}
    >
      {/* Full-width background with contained content */}
      <View
        style={{
          maxWidth: 1200,
          width: "100%",
          alignSelf: "center",
          flexDirection: isDesktop ? "row" : "column",
          justifyContent: "space-between",
          alignItems: "center",

          minHeight: isDesktop ? 400 : 300,
        }}
      >
        {/* Image content - now on the left */}
        <View
          style={{
            flex: isDesktop ? 1 : undefined,
            width: isDesktop ? "50%" : "100%",
          }}
        >
          <Image
            source={require("../assets/images/chucklehead.png")}
            style={{ width: "100%", maxHeight: 600 }}
            resizeMode="cover"
          />
        </View>

        {/* Text and button content - now on the right */}
        <View
          style={{
            flex: isDesktop ? 1 : undefined,
            justifyContent: "space-between",
            paddingLeft: isDesktop ? 80 : 0,
            gap: 30,
          }}
        >
          <Text
            style={{
              fontFamily: "RobotoFlex_400Regular",
              fontSize: fontSize.heading,
              color: "#fff",
              marginBottom: 10,
              textAlign: "left",
              width: "100%",
            }}
          >
            The perfect gift—automatically. {"\n"}
            No, really.
          </Text>
          <Text
            style={{
              fontFamily: "RobotoFlex_400Regular",
              fontSize: fontSize.body,
              color: "#fff",
              textAlign: "left",
              lineHeight: fontSize.body * 1.5,
              marginBottom: 20,
            }}
          >
            Just sign up. We'll take care of the rest. Picked. Purchased. Sent.
            For everyone on your list.
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: "#231F20",
              paddingHorizontal: 30,
              paddingVertical: 15,
              marginBottom: 20,
              alignSelf: "flex-start",
            }}
            onPress={() => setAuthModalVisible(true)}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              Get Started
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={authModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{ padding: 20 }}>
            <TouchableOpacity
              style={{ alignSelf: "flex-end", marginBottom: 20 }}
              onPress={() => setAuthModalVisible(false)}
            >
              <Text style={{ fontSize: 18, color: "#007AFF" }}>Close</Text>
            </TouchableOpacity>
            <Auth />
          </View>
        </View>
      </Modal>
    </View>
  );
}
