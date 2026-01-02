import { View, StyleSheet } from "react-native";
import { Text, Card } from "react-native-paper";
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
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <Card
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
              ]}
              onPress={() => onValueChange(option.value)}
            >
              <Card.Content>
                <View style={styles.optionContent}>
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
                  <Ionicons name="checkmark-circle" size={24} color="#000000" />
                )}
              </Card.Content>
            </Card>
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
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    marginBottom: 0,
  },
  optionSelected: {
    borderColor: "#000000",
    borderWidth: 2,
    backgroundColor: "#F5F5F5",
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: "#000000",
  },
  optionDescription: {},
  optionDescriptionSelected: {
    color: "#888",
  },
});


