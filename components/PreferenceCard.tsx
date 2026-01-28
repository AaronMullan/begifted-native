import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { BlurView } from "expo-blur";
import { PreferenceOption } from "../constants/gifting-preferences";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../lib/colors";

interface PreferenceCardProps {
  title: string;
  value: string;
  options: PreferenceOption[];
  onValueChange: (value: string) => void;
}

export default function PreferenceCard({
  title,
  value,
  options,
  onValueChange,
}: PreferenceCardProps) {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => onValueChange(option.value)}
            >
              <BlurView intensity={20} style={styles.optionBlur} pointerEvents="none" />
              <View style={styles.optionContent}>
                <View style={styles.optionTextWrap}>
                  <Text
                    variant="titleSmall"
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.optionDescription,
                      isSelected && styles.optionDescriptionSelected,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color={Colors.darks.black}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 12,
    color: Colors.darks.black,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    marginBottom: 0,
    backgroundColor: Colors.neutrals.light + "30",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    overflow: "hidden",
    position: "relative",
  },
  optionBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  optionSelected: {
    borderColor: Colors.darks.black,
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    position: "relative",
    zIndex: 1,
  },
  optionTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    marginBottom: 4,
    color: Colors.darks.black,
  },
  optionLabelSelected: {
    color: Colors.darks.black,
    fontWeight: "600",
  },
  optionDescription: {
    color: Colors.darks.black,
    opacity: 0.8,
  },
  optionDescriptionSelected: {
    color: Colors.darks.black,
    opacity: 0.7,
  },
});
