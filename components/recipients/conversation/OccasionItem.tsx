import { View, StyleSheet, Switch } from "react-native";
import { Text, Card } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

interface OccasionItemProps {
  occasion: {
    date: string;
    occasion_type: string;
    enabled: boolean;
  };
  onToggle: () => void;
  onEdit: () => void;
}

export function OccasionItem({
  occasion,
  onToggle,
  onEdit,
}: OccasionItemProps) {
  const formatDate = (dateString: string): string => {
    if (!dateString || typeof dateString !== "string" || dateString.includes("01-01")) {
      return "Add Date";
    }

    const parts = dateString.trim().split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }

    const fallback = new Date(dateString);
    if (!Number.isNaN(fallback.getTime())) {
      return fallback.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return "Add Date";
  };

  const formatOccasionType = (type: string): string => {
    const formatted = type.charAt(0).toUpperCase() + type.slice(1);
    return formatted.replace(/_/g, " ");
  };

  const displayDate = formatDate(occasion.date);

  return (
    <Card style={styles.occasionItem} onPress={onEdit}>
      <Card.Content>
        <View style={styles.occasionContent}>
          <View style={styles.occasionIcon}>
            <MaterialIcons name="card-giftcard" size={24} color="#000000" />
          </View>
          <View style={styles.occasionDetails}>
            <Text variant="titleSmall" style={styles.occasionType}>
              {formatOccasionType(occasion.occasion_type)}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.occasionDate,
                displayDate === "Add Date" && styles.addDateText,
              ]}
            >
              {displayDate}
            </Text>
          </View>
        </View>
        <Switch
          value={occasion.enabled}
          onValueChange={onToggle}
          trackColor={{ false: "#E0E0E0", true: "#333333" }}
          thumbColor={occasion.enabled ? "#000000" : "#f4f3f4"}
          ios_backgroundColor="#E0E0E0"
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  occasionItem: {
    marginBottom: 12,
    backgroundColor: "#f8f8f8",
  },
  occasionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  occasionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  occasionDetails: {
    flex: 1,
  },
  occasionType: {
    marginBottom: 4,
  },
  occasionDate: {},
  addDateText: {
    color: "#000000",
    fontStyle: "italic",
  },
});
