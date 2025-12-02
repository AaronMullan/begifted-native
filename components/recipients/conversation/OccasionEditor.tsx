import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IconButton } from "../../ui/IconButton";
import { PrimaryButton, SecondaryButton } from "../../ui/buttons";

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
            <Text style={styles.title}>Edit Occasion Date</Text>
            <IconButton
              icon={<Ionicons name="close" size={24} color="#231F20" />}
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>

          <View style={styles.content}>
            <Text style={styles.occasionType}>
              {formatOccasionType(occasion.occasion_type)}
            </Text>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={dateInput}
                onChangeText={setDateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={10}
              />
              <Text style={styles.helperText}>
                Enter date in YYYY-MM-DD format (e.g., 2026-12-25)
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <SecondaryButton
              title="Cancel"
              onPress={onClose}
              style={styles.cancelButton}
            />
            <PrimaryButton
              title="Save"
              onPress={handleSave}
              style={styles.saveButton}
            />
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
    fontSize: 18,
    fontWeight: "600",
    color: "#231F20",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  occasionType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#231F20",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#231F20",
    backgroundColor: "#fff",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
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
