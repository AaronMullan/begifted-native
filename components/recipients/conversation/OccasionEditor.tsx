import { useState } from "react";
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
import { KEYBOARD_CTA_GAP } from "@/lib/constants";

interface OccasionEditorProps {
  occasion: {
    /** Null for an undated occasion — the editor seeds an empty date field. */
    date: string | null;
    occasion_type: string;
    is_annual?: boolean;
  };
  visible: boolean;
  onClose: () => void;
  onSave: (date: string, isAnnual: boolean, name?: string) => void;
  /** Show the repeat / one-time toggle. Defaults to true. */
  showRecurrence?: boolean;
  /** Let the user rename the occasion; the display name is passed to onSave. */
  editableName?: boolean;
}

const FULL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// One-time dates are ENTERED month-day-year (US-customary) but STORED as ISO.
const MDY_RE = /^\d{2}-\d{2}-\d{4}$/;
const MONTH_DAY_RE = /^\d{2}-\d{2}$/;

function mdyToISO(mdy: string): string {
  const [month, day, year] = mdy.split("-");
  return `${year}-${month}-${day}`;
}

function isoToMDY(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}-${day}-${year}`;
}

function formatOccasionType(type: string): string {
  const formatted = type.charAt(0).toUpperCase() + type.slice(1);
  return formatted.replace(/_/g, " ");
}

/** True if the given 1-based month and day form a real calendar date. */
function isValidMonthDay(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Use a leap year so Feb 29 is accepted for annual occasions.
  const probe = new Date(2024, month - 1, day);
  return probe.getMonth() === month - 1 && probe.getDate() === day;
}

type SeededFields = {
  name: string;
  date: string;
  annual: boolean;
};

function seedFields(
  occasion: OccasionEditorProps["occasion"],
  visible: boolean,
  showRecurrence: boolean
): SeededFields {
  if (!visible || !occasion) return { name: "", date: "", annual: true };

  const annual = showRecurrence ? (occasion.is_annual ?? true) : false;
  const hasRealDate =
    occasion.date && !occasion.date.includes("01-01") ? occasion.date : "";

  let date: string;
  if (!hasRealDate) {
    date = "";
  } else if (annual && FULL_DATE_RE.test(hasRealDate)) {
    // Annual occasions ignore the year — show just month-day.
    date = hasRealDate.slice(5);
  } else if (FULL_DATE_RE.test(hasRealDate)) {
    date = isoToMDY(hasRealDate);
  } else {
    date = hasRealDate;
  }

  return { name: formatOccasionType(occasion.occasion_type), date, annual };
}

export function OccasionEditor({
  occasion,
  visible,
  onClose,
  onSave,
  showRecurrence = true,
  editableName = false,
}: OccasionEditorProps) {
  // Seed from props at mount too, not just on transitions: callers that
  // conditionally mount the editor (e.g. AboutRecipientView) never flip
  // `visible`, so a transition-only seed would leave the fields empty.
  const [dateInput, setDateInput] = useState(
    () => seedFields(occasion, visible, showRecurrence).date
  );
  const [nameInput, setNameInput] = useState(
    () => seedFields(occasion, visible, showRecurrence).name
  );
  const [isAnnual, setIsAnnual] = useState(
    () => seedFields(occasion, visible, showRecurrence).annual
  );
  const [errorMessage, setErrorMessage] = useState("");

  // Re-seed when the editor opens or its inputs change. Done during render
  // (not in an effect) via stored previous values.
  const [prevVisible, setPrevVisible] = useState(visible);
  const [prevOccasion, setPrevOccasion] = useState(occasion);
  const [prevShowRecurrence, setPrevShowRecurrence] = useState(showRecurrence);
  if (
    visible !== prevVisible ||
    occasion !== prevOccasion ||
    showRecurrence !== prevShowRecurrence
  ) {
    setPrevVisible(visible);
    setPrevOccasion(occasion);
    setPrevShowRecurrence(showRecurrence);
    if (visible && occasion) {
      const seeded = seedFields(occasion, visible, showRecurrence);
      setErrorMessage("");
      setNameInput(seeded.name);
      setIsAnnual(seeded.annual);
      setDateInput(seeded.date);
    }
  }

  const handleDateChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    let formatted: string;

    if (isAnnual) {
      // MM-DD
      const d = digits.slice(0, 4);
      formatted = d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d;
    } else {
      // MM-DD-YYYY
      const d = digits.slice(0, 8);
      if (d.length > 4) {
        formatted = `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
      } else if (d.length > 2) {
        formatted = `${d.slice(0, 2)}-${d.slice(2)}`;
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
    if (nextAnnual && MDY_RE.test(dateInput.trim())) {
      setDateInput(dateInput.trim().slice(0, 5)); // MM-DD-YYYY -> MM-DD
    } else if (!nextAnnual && MONTH_DAY_RE.test(dateInput.trim())) {
      // MM-DD -> next occurrence as a full editable date
      setDateInput(isoToMDY(getNextOccurrence(`--${dateInput.trim()}`)));
    } else if (nextAnnual && !MONTH_DAY_RE.test(dateInput.trim())) {
      setDateInput("");
    }

    setIsAnnual(nextAnnual);
  };

  const handleSave = () => {
    const trimmed = dateInput.trim();
    const name = editableName ? nameInput.trim() : undefined;

    if (editableName && !name) {
      setErrorMessage("Please give the occasion a name");
      return;
    }

    // Empty clears the date (caller decides what that means).
    if (!trimmed) {
      onSave("", isAnnual, name);
      onClose();
      return;
    }

    if (isAnnual) {
      const match = MONTH_DAY_RE.exec(trimmed);
      if (match) {
        const [month, day] = trimmed.split("-").map(Number);
        if (isValidMonthDay(month, day)) {
          // Year is optional for annual occasions — resolve the next occurrence.
          onSave(getNextOccurrence(`--${trimmed}`), true, name);
          onClose();
          return;
        }
      }
      setErrorMessage("Please enter the month and day in MM-DD format");
      return;
    }

    if (MDY_RE.test(trimmed)) {
      const [month, day, year] = trimmed.split("-").map(Number);
      if (year >= 1900 && isValidMonthDay(month, day)) {
        onSave(mdyToISO(trimmed), false, name);
        onClose();
        return;
      }
    }
    setErrorMessage("Please enter a full date in MM-DD-YYYY format");
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
          keyboardVerticalOffset={KEYBOARD_CTA_GAP}
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
                {editableName ? (
                  <View style={styles.fieldContainer}>
                    <TextInput
                      mode="outlined"
                      label="Name"
                      value={nameInput}
                      onChangeText={(text) => {
                        setNameInput(text);
                        setErrorMessage("");
                      }}
                      placeholder="e.g. Anniversary"
                      style={styles.input}
                    />
                  </View>
                ) : (
                  <Text variant="titleMedium" style={styles.occasionType}>
                    {formatOccasionType(occasion.occasion_type)}
                  </Text>
                )}

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
                    placeholder={isAnnual ? "MM-DD" : "MM-DD-YYYY"}
                    keyboardType="number-pad"
                    maxLength={isAnnual ? 5 : 10}
                    style={styles.input}
                  />
                  <Text variant="bodySmall" style={styles.helperText}>
                    {isAnnual
                      ? "Repeats every year — enter the month and day (e.g., 12-25)"
                      : "Enter the full date in MM-DD-YYYY format (e.g., 12-25-2026)"}
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
    backgroundColor: Colors.brand.beigeLight,
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
  // 44pt min tap target (HIG); transparent container, 24pt icon unchanged.
  closeButton: {
    margin: 0,
    width: 44,
    height: 44,
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
