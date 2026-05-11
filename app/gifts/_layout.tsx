import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import GradientBackground from "../../components/GradientBackground";

export default function GiftsLayout() {
  return (
    <View style={styles.root}>
      <GradientBackground />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
