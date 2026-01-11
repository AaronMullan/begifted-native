import { View, Text, Image, useWindowDimensions } from "react-native";
import { useState } from "react";
import Auth from "./Auth";

export default function Hero() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  const fontSize = {
    display: isDesktop ? 70 : isTablet ? 32 : 30,
  };

  return (
    <View
      style={{ width: "100%", backgroundColor: "#52A78B", paddingBottom: 60 }}
    >
      {/* Full-width background with contained content */}
      <View style={{ maxWidth: 1200, width: "100%", alignSelf: "center", paddingHorizontal: 16 }}>
        <View style={{ width: "100%" }}>
          <Text
            style={{
              fontFamily: "AzeretMono_400Regular",
              textAlign: "left",
              color: "#fff",
              fontSize: fontSize.display,
              borderColor: "#396D75",
              borderBottomWidth: 2,
              paddingBottom: 10,
              alignSelf: "flex-start",
            }}
          >
            BEGIFTED
          </Text>
        </View>
        <View
          style={{
            flexDirection: isDesktop ? "row" : "column",
            minHeight: isDesktop ? 500 : 300,
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#52A78B",
          }}
          accessibilityRole="header"
          accessibilityLabel="Hero"
          accessibilityHint="Hero"
        >
          <Text
            style={{
              fontFamily: "Times New Roman",
              fontStyle: "italic",
              fontSize: fontSize.display,
              fontWeight: "regular",
              marginBottom: 16,
              color: "#fff",
              textAlign: "left",
            }}
          >
            <Text>This gifting season{"\n"}</Text>
            <Text>give yourself the{"\n"}</Text>
            <Text style={{ color: "#231F20" }}>gift of time.</Text>
          </Text>

          <Image
            source={require("../assets/images/bike-guys.png")}
            style={{
              width: isDesktop ? 530 : "100%",
              height: isDesktop ? 530 : 400,
              borderColor: "#fff",
              borderWidth: 2,
            }}
            resizeMode="cover"
          />
        </View>
      </View>
    </View>
  );
}
