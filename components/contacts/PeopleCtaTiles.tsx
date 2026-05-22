import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";

type PeopleCtaTilesProps = {
  onImportPress: () => void;
  onAddManuallyPress: () => void;
  importDisabled?: boolean;
  borderColor?: string;
};

const PeopleCtaTiles: React.FC<PeopleCtaTilesProps> = ({
  onImportPress,
  onAddManuallyPress,
  importDisabled = false,
  borderColor = Colors.white,
}) => {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onImportPress}
        disabled={importDisabled}
        accessibilityRole="button"
        accessibilityLabel="Import from contacts"
        style={({ pressed }) => [
          styles.tile,
          { borderColor },
          pressed && styles.tilePressed,
          importDisabled && styles.tileDisabled,
        ]}
      >
        <MaterialIcons name="people-alt" size={24} color={Colors.blues.dark} />
        <Text style={styles.label}>Import From Contacts</Text>
      </Pressable>
      <Pressable
        onPress={onAddManuallyPress}
        accessibilityRole="button"
        accessibilityLabel="Add people manually"
        style={({ pressed }) => [
          styles.tile,
          { borderColor },
          pressed && styles.tilePressed,
        ]}
      >
        <MaterialIcons name="add" size={24} color={Colors.blues.dark} />
        <Text style={styles.label}>Add People Manually</Text>
      </Pressable>
    </View>
  );
};

export default PeopleCtaTiles;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
  },
  tile: {
    flex: 1,
    height: 78,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  tilePressed: {
    opacity: 0.6,
  },
  tileDisabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.blues.dark,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
