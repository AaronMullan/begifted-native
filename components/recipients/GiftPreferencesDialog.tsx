import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import { Button, IconButton, Text, TextInput } from "react-native-paper";
import type { Recipient } from "../../types/recipient";
import { dialogStyles as styles } from "./recipient-dialog-styles";
import { KEYBOARD_CTA_GAP } from "@/lib/constants";

type GiftPreferencesDialogProps = {
  visible: boolean;
  recipient: Recipient;
  defaultEmotionalTone?: string;
  onClose: () => void;
  onSave: (fields: Partial<Recipient>) => Promise<void>;
};

export const GiftPreferencesDialog: React.FC<GiftPreferencesDialogProps> = ({
  visible,
  recipient,
  defaultEmotionalTone,
  onClose,
  onSave,
}) => {
  // Seed the tone field with the recipient's own tone, falling back to the
  // giver's default so a single Save accepts that default for this recipient.
  const seededTone =
    recipient.emotional_tone_preference?.trim() ||
    defaultEmotionalTone?.trim() ||
    "";
  const [tone, setTone] = useState(seededTone);
  const [minBudget, setMinBudget] = useState(
    recipient.gift_budget_min != null ? String(recipient.gift_budget_min) : ""
  );
  const [maxBudget, setMaxBudget] = useState(
    recipient.gift_budget_max != null ? String(recipient.gift_budget_max) : ""
  );
  const [address, setAddress] = useState(recipient.address ?? "");
  const [addressLine2, setAddressLine2] = useState(
    recipient.address_line_2 ?? ""
  );
  const [city, setCity] = useState(recipient.city ?? "");
  const [state, setState] = useState(recipient.state ?? "");
  const [zipCode, setZipCode] = useState(recipient.zip_code ?? "");
  const [saving, setSaving] = useState(false);

  // Re-seed the editable fields only when the dialog opens — never while it's
  // open. The detail screen polls the recipient after a save, and a background
  // refetch that swaps the recipient object mid-edit must not wipe in-progress
  // typing. Done during render (not in an effect) via the stored previous
  // value; the bumped seed key remounts the inputs so defaultValue re-reads.
  const [seedKey, setSeedKey] = useState(0);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setSeedKey(seedKey + 1);
      setTone(seededTone);
      setMinBudget(
        recipient.gift_budget_min != null
          ? String(recipient.gift_budget_min)
          : ""
      );
      setMaxBudget(
        recipient.gift_budget_max != null
          ? String(recipient.gift_budget_max)
          : ""
      );
      setAddress(recipient.address ?? "");
      setAddressLine2(recipient.address_line_2 ?? "");
      setCity(recipient.city ?? "");
      setState(recipient.state ?? "");
      setZipCode(recipient.zip_code ?? "");
    }
  }

  const handleSave = async () => {
    setSaving(true);
    const parsedMin = minBudget.trim() === "" ? null : Number(minBudget);
    const parsedMax = maxBudget.trim() === "" ? null : Number(maxBudget);
    await onSave({
      emotional_tone_preference: tone.trim() || undefined,
      gift_budget_min:
        parsedMin != null && !Number.isNaN(parsedMin) ? parsedMin : undefined,
      gift_budget_max:
        parsedMax != null && !Number.isNaN(parsedMax) ? parsedMax : undefined,
      address: address.trim() || undefined,
      address_line_2: addressLine2.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      zip_code: zipCode.trim() || undefined,
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={KEYBOARD_CTA_GAP}
      >
        <Pressable style={styles.dismissArea} onPress={Keyboard.dismiss}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                Gift Preferences
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={onClose}
                style={styles.modalClose}
              />
            </View>
            {/* Uncontrolled inputs (defaultValue, keyed remount per open):
                forcing `value` back onto the native field on every keystroke
                races iOS autocorrect's commit-on-space and drops typed spaces.
                Native text is authoritative while open; state only feeds
                Save. */}
            <View style={styles.modalBody} key={seedKey}>
              <TextInput
                mode="outlined"
                label="Emotional tone"
                defaultValue={tone}
                onChangeText={setTone}
                multiline
                style={styles.input}
              />
              <View style={styles.row}>
                <TextInput
                  mode="outlined"
                  label="Min $"
                  defaultValue={minBudget}
                  onChangeText={setMinBudget}
                  keyboardType="number-pad"
                  style={[styles.input, styles.budgetInput]}
                />
                <TextInput
                  mode="outlined"
                  label="Max $"
                  defaultValue={maxBudget}
                  onChangeText={setMaxBudget}
                  keyboardType="number-pad"
                  style={[styles.input, styles.budgetInput]}
                />
              </View>
              <TextInput
                mode="outlined"
                label="Address"
                defaultValue={address}
                onChangeText={setAddress}
                style={styles.input}
              />
              <TextInput
                mode="outlined"
                label="Address line 2"
                defaultValue={addressLine2}
                onChangeText={setAddressLine2}
                style={styles.input}
              />
              <View style={styles.row}>
                <TextInput
                  mode="outlined"
                  label="City"
                  defaultValue={city}
                  onChangeText={setCity}
                  style={[styles.input, styles.budgetInput]}
                />
                <TextInput
                  mode="outlined"
                  label="State"
                  defaultValue={state}
                  onChangeText={setState}
                  style={[styles.input, styles.budgetInput]}
                />
              </View>
              <TextInput
                mode="outlined"
                label="ZIP code"
                defaultValue={zipCode}
                onChangeText={setZipCode}
                style={styles.input}
              />
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
                disabled={saving}
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
