import { Link } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function LoggedIn() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        User has been logged in. You can use the hamburger menu above to see the
        FAQ, add contacts, or sign out.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    fontSize: 18,
    color: "#666",
  },
});
