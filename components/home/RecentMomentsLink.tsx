import { Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";

type RecentMomentsLinkProps = {
  onPress?: () => void;
};

const RecentMomentsLink: React.FC<RecentMomentsLinkProps> = ({ onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel="Tell us how your recent moments went"
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
    >
      <Text style={styles.text}>Tell us how your recent moments went</Text>
      <MaterialIcons name="chevron-right" size={16} color={Colors.blues.dark} />
    </Pressable>
  );
};

export default RecentMomentsLink;

const styles = StyleSheet.create({
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 1,
  },
  linkPressed: {
    opacity: 0.6,
  },
  text: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.blues.dark,
    fontSize: 13,
    fontWeight: "700",
  },
});
