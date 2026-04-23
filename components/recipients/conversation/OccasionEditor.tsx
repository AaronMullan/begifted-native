import { useState, useEffect } from "react";
import { View, Modal, StyleSheet, KeyboardAvoidingView, Keyboard, Platform, Pressable } from "react-native";
import { Text, TextInput, IconButton, Button, Dialog, Portal } from "react-native-paper";

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
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (visible && occasion) {
      setErrorMessage("");
      if (occasion.date && !occasion.date.includes("01-01")) {
        setDateInput(occasion.date);
      } else {
        setDateInput("");
      }
    }
  }, [visible, occasion]);

  const handleDateChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 6) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    setDateInput(formatted);
    setErrorMessage("");
  };

  const handleSave = () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (dateInput.trim() && dateRegex.test(dateInput.trim())) {
      onSave(dateInput.trim());
      onClose();
    } else if (!dateInput.trim()) {
      onSave("");
      onClose();
    } else {
      setErrorMessage("Please enter date in YYYY-MM-DD format");
    }
  };

  const formatOccasionType = (type: string): string => {
    const formatted = type.charAt(0).toUpperCase() + type.slice(1);
    return formatted.replace(/_/g, " ");
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.dismissArea} onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.header}>
                <Text variant="titleLarge" style={styles.title}>
                  Edit Occasion
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
                    onChangeText={handleDateChange}
                    placeholder="YYYY-MM-DD"
                    keyboardType="number-pad"
                    maxLength={10}
                    style={styles.input}
                  />
                  <Text variant="bodySmall" style={styles.helperText}>
                    Enter date in YYYY-MM-DD format (e.g., 2026-12-25)
                  </Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Button
                  mode="outlined"
                  textColor="#000000"
                  onPress={onClose}
                  style={styles.cancelButton}
                >
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
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      <Portal>
        <Dialog
          visible={!!errorMessage}
          onDismiss={() => setErrorMessage("")}
          style={styles.dialog}
        >
          <Dialog.Title>Invalid Input</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setErrorMessage("")}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dismissArea: {
    width: "100%",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#f4e6dd",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  dialog: {
    borderRadius: 16,
  },
});
