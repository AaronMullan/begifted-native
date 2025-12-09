import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Recipient } from "../types/recipient";

interface RecipientCardProps {
  recipient: Recipient;
  onEdit: (recipient: Recipient) => void;
  onDelete: (id: string) => void;
}

export default function RecipientCard({
  recipient,
  onEdit,
  onDelete,
}: RecipientCardProps) {
  const handleDelete = () => {
    Alert.alert(
      "Delete Recipient",
      `Are you sure you want to delete ${recipient.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(recipient.id),
        },
      ]
    );
  };

  // Format birthday for display
  const formatBirthday = (birthday?: string) => {
    if (!birthday) return null;
    const date = new Date(birthday);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{recipient.name}</Text>
        <Text style={styles.relationship}>{recipient.relationship_type}</Text>
        {recipient.birthday && (
          <Text style={styles.birthday}>
            Birthday: {formatBirthday(recipient.birthday)}
          </Text>
        )}
        {recipient.interests && recipient.interests.length > 0 && (
          <Text style={styles.interests}>
            Interests: {recipient.interests.join(", ")}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(recipient)}
        >
          <Text style={styles.editButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 4,
  },
  relationship: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  birthday: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 4,
  },
  interests: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    cursor: "pointer",
  },
  editButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    cursor: "pointer",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
