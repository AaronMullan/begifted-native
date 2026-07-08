import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import {
  Button,
  HelperText,
  IconButton,
  Text,
  TextInput,
} from "react-native-paper";
import type { Recipient } from "../../types/recipient";
import {
  formatBirthdayDisplay,
  isInvalidBirthdayInput,
  normalizeBirthday,
} from "../../utils/birthday";
import { cleanRelationship } from "../../lib/format-name";
import { dialogStyles as styles } from "./recipient-dialog-styles";

type InformationDialogProps = {
  visible: boolean;
  recipient: Recipient;
  onClose: () => void;
  onSave: (fields: Partial<Recipient>) => Promise<void>;
};

export const InformationDialog: React.FC<InformationDialogProps> = ({
  visible,
  recipient,
  onClose,
  onSave,
}) => {
  // Seed the editable birthday with the customary "Month Day, Year" display
  // (e.g. "November 13, 1946", or "August 18" when the year is unknown) instead
  // of the raw stored ISO/vCard string (DEV-178). The parser accepts this
  // friendly form too, so it re-normalizes to canonical storage on save.
  const seedBirthday = (b?: string) => formatBirthdayDisplay(b);

  const [name, setName] = useState(recipient.name);
  // Seed empty when the stored value is the placeholder "null" so Save can't
  // silently re-persist it; the user must enter a real relationship (DEV-139).
  const [relationshipType, setRelationshipType] = useState(
    cleanRelationship(recipient.relationship_type)
  );
  const [birthday, setBirthday] = useState(seedBirthday(recipient.birthday));
  const [saving, setSaving] = useState(false);

  // Re-seed the editable fields when the dialog opens or its recipient changes.
  // Done during render (not in an effect) via stored previous values.
  const [prevVisible, setPrevVisible] = useState(visible);
  const [prevRecipient, setPrevRecipient] = useState(recipient);
  if (visible !== prevVisible || recipient !== prevRecipient) {
    setPrevVisible(visible);
    setPrevRecipient(recipient);
    if (visible) {
      setName(recipient.name);
      setRelationshipType(cleanRelationship(recipient.relationship_type));
      setBirthday(seedBirthday(recipient.birthday));
    }
  }

  const birthdayInvalid = isInvalidBirthdayInput(birthday);
  const canSave =
    name.trim().length > 0 &&
    relationshipType.trim().length > 0 &&
    !birthdayInvalid;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const trimmedBirthday = birthday.trim();
    await onSave({
      name: name.trim(),
      relationship_type: relationshipType.trim(),
      // Empty leaves the stored birthday untouched (undefined = no change),
      // matching how the other optional fields behave here.
      birthday:
        trimmedBirthday === ""
          ? undefined
          : (normalizeBirthday(trimmedBirthday) ?? undefined),
    });
    setSaving(false);
  };

  return (
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
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                Information
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={onClose}
                style={styles.modalClose}
              />
            </View>
            <View style={styles.modalBody}>
              <TextInput
                mode="outlined"
                label="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
              <TextInput
                mode="outlined"
                label="Relationship"
                value={relationshipType}
                onChangeText={setRelationshipType}
                style={styles.input}
              />
              <TextInput
                mode="outlined"
                label="Birthday"
                value={birthday}
                onChangeText={setBirthday}
                placeholder="August 18, 1985 or August 18"
                style={styles.input}
              />
              <HelperText type={birthdayInvalid ? "error" : "info"}>
                {birthdayInvalid
                  ? "Use a date like August 18, 1985, or August 18 if you don't know the year."
                  : "Year optional — add it so we can show their age accurately."}
              </HelperText>
            </View>
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={onClose}
                style={styles.modalFooterButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={!canSave || saving}
                style={styles.modalFooterButton}
              >
                Save
              </Button>
            </View>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
