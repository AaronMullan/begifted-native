import type { ReactNode } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "@/lib/colors";

type MenuCardProps = {
  icon?: keyof typeof MaterialIcons.glyphMap;
  imageUri?: string;
  title: string;
  description: string;
  onPress: () => void;
  onLongPress?: () => void;
  showChevron?: boolean;
  rightContent?: ReactNode;
};

const MenuCard: React.FC<MenuCardProps> = ({
  icon,
  imageUri,
  title,
  description,
  onPress,
  onLongPress,
  showChevron = false,
  rightContent,
}) => {
  return (
    <Pressable style={styles.card} onPress={onPress} onLongPress={onLongPress}>
      {imageUri ? (
        <View style={styles.iconContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.recipientPhoto}
            contentFit="cover"
          />
        </View>
      ) : icon ? (
        <View style={styles.iconContainer}>
          <MaterialIcons name={icon} size={32} color={Colors.blues.medium} />
        </View>
      ) : null}
      <View style={styles.textContent}>
        <Text variant="titleLarge" style={styles.title}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          {description}
        </Text>
      </View>
      {rightContent}
      {showChevron && (
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={Colors.white}
          style={styles.chevron}
        />
      )}
    </Pressable>
  );
};

export default MenuCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "rgba(0,0,0,0.30)",
    borderRadius: 18,
    overflow: "hidden",
  },
  iconContainer: {
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.40)",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  recipientPhoto: {
    width: 80,
    height: "100%",
  },
  textContent: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    color: Colors.white,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  description: {
    color: Colors.white,
    opacity: 0.7,
  },
  chevron: {
    alignSelf: "center",
    marginRight: 16,
  },
});
