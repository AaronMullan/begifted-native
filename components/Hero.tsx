import { View, Text, Image } from "react-native";
import { useState } from "react";
import Auth from "./Auth";
import { useResponsive } from "../hooks/use-responsive";
import { colors, fonts, spacing } from "../constants/theme";

export default function Hero() {
  const { isDesktop, isTablet } = useResponsive();

  const fontSize = {
    display: isDesktop ? 70 : isTablet ? 32 : 30,
  };

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: colors.primaryTeal,
        paddingBottom: spacing.padding.xxxl,
      }}
    >
      {/* Full-width background with contained content */}
      <View
        style={{
          maxWidth: spacing.contentMaxWidth,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View style={{ width: "100%" }}>
          <Text
            style={{
              fontFamily: fonts.display,
              textAlign: "left",
              color: colors.white,
              fontSize: fontSize.display,
              borderColor: colors.darkTeal,
              borderBottomWidth: 2,
              paddingBottom: spacing.margin.sm,
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
            backgroundColor: colors.primaryTeal,
          }}
          accessibilityRole="header"
          accessibilityLabel="Hero"
          accessibilityHint="Hero"
        >
          <Text
            style={{
              fontFamily: fonts.hero,
              fontStyle: "italic",
              fontSize: fontSize.display,
              fontWeight: "regular",
              marginBottom: spacing.margin.lg,
              color: colors.white,
              textAlign: "left",
            }}
          >
            <Text>This gifting season{"\n"}</Text>
            <Text>give yourself the{"\n"}</Text>
            <Text style={{ color: colors.darkText }}>gift of time.</Text>
          </Text>

          <Image
            source={require("../assets/images/bike-guys.png")}
            style={{
              width: isDesktop ? 530 : "100%",
              height: isDesktop ? 530 : 400,
              borderColor: colors.white,
              borderWidth: 2,
            }}
            resizeMode="cover"
          />
        </View>
      </View>
    </View>
  );
}
