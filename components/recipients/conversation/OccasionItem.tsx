import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface OccasionItemProps {
  occasion: {
    date: string;
    occasion_type: string;
    enabled: boolean;
  };
  onToggle: () => void;
  onEdit: () => void;
}

export function OccasionItem({ occasion, onToggle, onEdit }: OccasionItemProps) {
  const formatDate = (dateString: string): string => {
    if (!dateString || dateString.includes("01-01")) {
      return "Add Date";
    }
    
    const parts = dateString.split("-");
    if (parts.length !== 3) {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatOccasionType = (type: string): string => {
    const formatted = type.charAt(0).toUpperCase() + type.slice(1);
    return formatted.replace(/_/g, " ");
  };

  const displayDate = formatDate(occasion.date);

  return (
    <TouchableOpacity
      onPress={onEdit}
      style={styles.occasionItem}
      activeOpacity={0.7}
    >
      <View style={styles.occasionContent}>
        <View style={styles.occasionIcon}>
          <Ionicons name="gift-outline" size={24} color="#FFB6C1" />
        </View>
        <View style={styles.occasionDetails}>
          <Text style={styles.occasionType}>
            {formatOccasionType(occasion.occasion_type)}
          </Text>
          <Text
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
        trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
        thumbColor={occasion.enabled ? "#FF6B9D" : "#f4f3f4"}
        ios_backgroundColor="#E0E0E0"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  occasionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
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
    backgroundColor: "#FFF0F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  occasionDetails: {
    flex: 1,
  },
  occasionType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 4,
  },
  occasionDate: {
    fontSize: 14,
    color: "#666",
  },
  addDateText: {
    color: "#FF6B9D",
    fontStyle: "italic",
  },
});

