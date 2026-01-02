import { useState, useEffect } from "react";
import { View, Modal, StyleSheet, Alert } from "react-native";
import { Text, TextInput, IconButton, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

interface OccasionEditorProps {
  occasion: {
    date: string;
    occasion_type: string;
  };
  visible: boolean;
  onClose: () => void;
  onSave: (date: string) => void;
}

export function OccasionEditor({
  occasion,
  visible,
  onClose,
  onSave,
}: OccasionEditorProps) {
  const [dateInput, setDateInput] = useState("");

  useEffect(() => {
    if (visible && occasion) {
      // Initialize with current date or empty if it's a placeholder
      if (occasion.date && !occasion.date.includes("01-01")) {
        setDateInput(occasion.date);
      } else {
        setDateInput("");
      }
    }
  }, [visible, occasion]);

  const handleSave = () => {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateInput.trim() && dateRegex.test(dateInput.trim())) {
      onSave(dateInput.trim());
      onClose();
    } else if (!dateInput.trim()) {
      // Allow saving empty date (will show "Add Date")
      onSave("");
      onClose();
    } else {
      // Invalid format - show error
      Alert.alert("Invalid Date", "Please enter date in YYYY-MM-DD format");
    }
  };

  const formatOccasionType = (type: string): string => {
    const formatted = type.charAt(0).toUpperCase() + type.slice(1);
    return formatted.replace(/_/g, " ");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>
              Edit Occasion Date
            </Text>
            <IconButton
              icon="close"
              size={24}
              iconColor="#000000"
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>

          <View style={styles.content}>
            <Text variant="titleMedium" style={styles.occasionType}>
              {formatOccasionType(occasion.occasion_type)}
            </Text>

            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="Date"
                value={dateInput}
                onChangeText={setDateInput}
                placeholder="YYYY-MM-DD"
                keyboardType="numeric"
                maxLength={10}
                style={styles.input}
              />
              <Text variant="bodySmall" style={styles.helperText}>
                Enter date in YYYY-MM-DD format (e.g., 2026-12-25)
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Button mode="outlined" onPress={onClose} style={styles.cancelButton}>
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor="#000000"
              onPress={handleSave}
              style={styles.saveButton}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    flex: 1,
  },
  closeButton: {
    margin: 0,
  },
  content: {
    padding: 16,
  },
  occasionType: {
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 4,
  },
  helperText: {
    marginTop: 4,
    color: "#666",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
