import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { PreferenceOption } from "../constants/gifting-preferences";
import { Ionicons } from "@expo/vector-icons";

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
      <Text style={styles.title}>{title}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
              ]}
              onPress={() => onValueChange(option.value)}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    isSelected && styles.optionDescriptionSelected,
                  ]}
                >
                  {option.description}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color="#FFB6C1" />
              )}
            </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  optionSelected: {
    borderColor: "#FFB6C1",
    borderWidth: 2,
    backgroundColor: "#FFF0F5",
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: "#FF6B9D",
  },
  optionDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  optionDescriptionSelected: {
    color: "#888",
  },
});


