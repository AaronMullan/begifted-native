import { Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";

export default function AddPeopleTile() {
  const router = useRouter();

  const handlePress = () => {
    router.push("/contacts/add");
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Add people"
      style={styles.tile}
    >
      <MaterialIcons name="add" size={28} color={Colors.blues.dark} />
      <Text style={styles.label}>Add People</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 110,
    height: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.blues.dark,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  label: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.blues.dark,
    fontSize: 13,
    fontWeight: "500",
  },
});
