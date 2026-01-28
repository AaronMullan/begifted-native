import { Alert, StyleSheet, View, Pressable } from "react-native";
import { Text, Button } from "react-native-paper";
import { BlurView } from "expo-blur";
import { Recipient } from "../types/recipient";
import { Colors } from "../lib/colors";

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

    // Parse YYYY-MM-DD format and create date in local timezone
    const [year, month, day] = birthday.split("-").map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Pressable style={styles.card}>
      <BlurView intensity={20} style={styles.blurBackground} />
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: Colors.neutrals.light + "30", // Low opacity (~19%)
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    overflow: "hidden",
    position: "relative",
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    position: "relative",
    zIndex: 1,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    marginBottom: 4,
    color: Colors.darks.black,
  },
  relationship: {
    marginBottom: 4,
    color: Colors.darks.black,
    opacity: 0.8,
  },
  birthday: {
    color: Colors.darks.black,
    opacity: 0.7,
    marginBottom: 4,
  },
  interests: {
    fontStyle: "italic",
    color: Colors.darks.black,
    opacity: 0.7,
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
