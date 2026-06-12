import { useState, useEffect } from "react";
import {
  View,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
} from "react-native";
import {
  Text,
  TextInput,
  IconButton,
  Button,
  Dialog,
  Portal,
  SegmentedButtons,
} from "react-native-paper";
import { Colors } from "../../../lib/colors";
import { getNextOccurrence } from "../../../utils/occasion-dates";

interface OccasionEditorProps {
  occasion: {
    date: string;
    occasion_type: string;
    is_annual?: boolean;
  };
  visible: boolean;
  onClose: () => void;
  onSave: (date: string, isAnnual: boolean) => void;
  /** Show the repeat / one-time toggle. Defaults to true. */
  showRecurrence?: boolean;
}

const FULL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY_RE = /^\d{2}-\d{2}$/;

/** True if the given 1-based month and day form a real calendar date. */
function isValidMonthDay(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Use a leap year so Feb 29 is accepted for annual occasions.
  const probe = new Date(2024, month - 1, day);
  return probe.getMonth() === month - 1 && probe.getDate() === day;
}

export function OccasionEditor({
  occasion,
  visible,
  onClose,
  onSave,
  showRecurrence = true,
}: OccasionEditorProps) {
  const [dateInput, setDateInput] = useState("");
  const [isAnnual, setIsAnnual] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (visible && occasion) {
      setErrorMessage("");
      const annual = showRecurrence ? occasion.is_annual ?? true : false;
      setIsAnnual(annual);

      const hasRealDate =
        occasion.date && !occasion.date.includes("01-01") ? occasion.date : "";

      if (!hasRealDate) {
        setDateInput("");
      } else if (annual && FULL_DATE_RE.test(hasRealDate)) {
        // Annual occasions ignore the year — show just month-day.
        setDateInput(hasRealDate.slice(5));
      } else {
        setDateInput(hasRealDate);
      }
    }
  }, [visible, occasion, showRecurrence]);

  const handleDateChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    let formatted: string;

    if (isAnnual) {
      // MM-DD
      const d = digits.slice(0, 4);
      formatted = d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d;
    } else {
      // YYYY-MM-DD
      const d = digits.slice(0, 8);
      if (d.length > 6) {
        formatted = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
      } else if (d.length > 4) {
        formatted = `${d.slice(0, 4)}-${d.slice(4)}`;
      } else {
        formatted = d;
      }
    }

    setDateInput(formatted);
    setErrorMessage("");
  };

  const handleModeChange = (nextAnnual: boolean) => {
    if (nextAnnual === isAnnual) return;
    setErrorMessage("");

    // Convert the current input so the user doesn't lose their entry.
    if (nextAnnual && FULL_DATE_RE.test(dateInput.trim())) {
      setDateInput(dateInput.trim().slice(5)); // YYYY-MM-DD -> MM-DD
    } else if (!nextAnnual && MONTH_DAY_RE.test(dateInput.trim())) {
      // MM-DD -> next occurrence as a full editable date
      setDateInput(getNextOccurrence(`--${dateInput.trim()}`));
    } else if (nextAnnual && !MONTH_DAY_RE.test(dateInput.trim())) {
      setDateInput("");
    }

    setIsAnnual(nextAnnual);
  };

  const handleSave = () => {
    const trimmed = dateInput.trim();

    // Empty clears the date (caller decides what that means).
    if (!trimmed) {
      onSave("", isAnnual);
      onClose();
      return;
    }

    if (isAnnual) {
      const match = MONTH_DAY_RE.exec(trimmed);
      if (match) {
        const [month, day] = trimmed.split("-").map(Number);
        if (isValidMonthDay(month, day)) {
          // Year is optional for annual occasions — resolve the next occurrence.
          onSave(getNextOccurrence(`--${trimmed}`), true);
          onClose();
          return;
        }
      }
      setErrorMessage("Please enter the month and day in MM-DD format");
      return;
    }

    if (FULL_DATE_RE.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map(Number);
      if (year >= 1900 && isValidMonthDay(month, day)) {
        onSave(trimmed, false);
        onClose();
        return;
      }
    }
    setErrorMessage("Please enter a full date in YYYY-MM-DD format");
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

                {showRecurrence && (
                  <View style={styles.fieldContainer}>
                    <SegmentedButtons
                      value={isAnnual ? "annual" : "oneTime"}
                      onValueChange={(value) =>
                        handleModeChange(value === "annual")
                      }
                      buttons={[
                        { value: "annual", label: "Repeats yearly" },
                        { value: "oneTime", label: "One-time" },
                      ]}
                    />
                  </View>
                )}

                <View style={styles.fieldContainer}>
                  <TextInput
                    mode="outlined"
                    label="Date"
                    value={dateInput}
                    onChangeText={handleDateChange}
                    placeholder={isAnnual ? "MM-DD" : "YYYY-MM-DD"}
                    keyboardType="number-pad"
                    maxLength={isAnnual ? 5 : 10}
                    style={styles.input}
                  />
                  <Text variant="bodySmall" style={styles.helperText}>
                    {isAnnual
                      ? "Repeats every year — enter the month and day (e.g., 12-25)"
                      : "Enter the full date in YYYY-MM-DD format (e.g., 2026-12-25)"}
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
    backgroundColor: Colors.brand.cream,
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
    marginBottom: 16,
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
