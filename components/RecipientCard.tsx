import { Alert, StyleSheet, View } from "react-native";
import { Card, Text, Button } from "react-native-paper";
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
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardContent}>
          <View style={styles.info}>
            <Text variant="titleMedium" style={styles.name}>
              {recipient.name}
            </Text>
            <Text variant="bodyMedium" style={styles.relationship}>
              {recipient.relationship_type}
            </Text>
            {recipient.birthday && (
              <Text variant="bodySmall" style={styles.birthday}>
                Birthday: {formatBirthday(recipient.birthday)}
              </Text>
            )}
            {recipient.interests && recipient.interests.length > 0 && (
              <Text variant="bodySmall" style={styles.interests}>
                Interests: {recipient.interests.join(", ")}
              </Text>
            )}
          </View>
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={() => onEdit(recipient)}
              style={styles.editButton}
              compact
            >
              View
            </Button>
            <Button
              mode="outlined"
              onPress={handleDelete}
              style={styles.deleteButton}
              compact
            >
              Delete
            </Button>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    marginBottom: 4,
  },
  relationship: {
    marginBottom: 4,
  },
  birthday: {
    color: "#666666",
    marginBottom: 4,
  },
  interests: {
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    minWidth: 70,
  },
  deleteButton: {
    minWidth: 70,
  },
});
