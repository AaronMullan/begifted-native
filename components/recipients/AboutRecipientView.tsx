import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Dialog,
  HelperText,
  IconButton,
  Menu,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { supabase } from "../../lib/supabase";
import type { Occasion } from "../../lib/api";
import type { Recipient } from "../../types/recipient";
import {
  useDeleteOccasion,
  useRecipientOccasions,
  useUpdateOccasion,
} from "../../hooks/use-occasion-mutations";
import { OccasionEditor } from "./conversation/OccasionEditor";
import {
  formatBirthdayDisplay,
  isInvalidBirthdayInput,
  normalizeBirthday,
} from "../../utils/birthday";
import { formatOccasionType } from "../../utils/home-occasions";
import { cleanRelationship } from "../../lib/format-name";

type AboutRecipientViewProps = {
  recipient: Recipient;
  /**
   * The giver's onboarding-derived default tone. Shown (clearly labeled) as the
   * recipient's tone when they have none of their own set (DEV-99).
   */
  defaultEmotionalTone?: string;
  /** True while the synopsis is being regenerated server-side. */
  isResynthesizing: boolean;
  /** Trigger a profile resynthesis (owned by the detail screen). */
  onResynthesize: () => void;
  onRecipientUpdated: (updated: Recipient) => void;
  onOpenUpdateChat: () => void;
  onDelete: () => void;
};

function formatOccasionDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return dateString;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function formatAddress(r: Recipient): string {
  const line1 = [r.address, r.address_line_2].filter(Boolean).join(" ");
  const line2 = [r.city, r.state].filter(Boolean).join(", ");
  const line3 = r.zip_code ?? "";
  return [line1, line2, line3].filter(Boolean).join("\n");
}

export const AboutRecipientView: React.FC<AboutRecipientViewProps> = ({
  recipient,
  defaultEmotionalTone,
  isResynthesizing,
  onResynthesize,
  onRecipientUpdated,
  onOpenUpdateChat,
  onDelete,
}) => {
  const { data: occasions = [] } = useRecipientOccasions(recipient.id);
  const updateOccasion = useUpdateOccasion();
  const deleteOccasion = useDeleteOccasion();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingOccasion, setEditingOccasion] = useState<Occasion | null>(null);
  const [occasionToDelete, setOccasionToDelete] = useState<Occasion | null>(
    null
  );
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [informationOpen, setInformationOpen] = useState(false);

  const handleSavePartial = async (
    fields: Partial<Recipient>,
    triggerResync: boolean
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from("recipients")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", recipient.id)
      .eq("user_id", session.user.id);
    if (error) {
      console.error("Failed to update recipient:", error);
      return;
    }
    onRecipientUpdated({ ...recipient, ...fields });
    if (triggerResync) {
      onResynthesize();
    }
  };

  const handleConfirmDeleteOccasion = () => {
    if (!occasionToDelete) return;
    deleteOccasion.mutate(
      { occasionId: occasionToDelete.id, recipientId: recipient.id },
      { onSettled: () => setOccasionToDelete(null) }
    );
  };

  const addressBlock = formatAddress(recipient);
  const budgetMin =
    recipient.gift_budget_min != null ? `$${recipient.gift_budget_min}` : "—";
  const budgetMax =
    recipient.gift_budget_max != null ? `$${recipient.gift_budget_max}` : "—";

  return (
    <View style={styles.container}>
      <Text style={styles.heroAbout}>About</Text>
      <Text style={styles.heroName}>{recipient.name}</Text>

      <Text style={styles.sectionLabel}>
        HOW BEGIFTED UNDERSTANDS {recipient.name.toUpperCase()}
      </Text>
      {isResynthesizing && (
        <View style={styles.refreshingRow}>
          <ActivityIndicator size={14} color={Colors.blues.medium} />
          <Text style={styles.refreshingText}>
            Refreshing recipient profile…
          </Text>
        </View>
      )}
      <Text
        style={[styles.narrative, isResynthesizing && styles.narrativeDimmed]}
      >
        {recipient.synthesized_profile?.trim() ||
          `We're still getting to know ${recipient.name}. Tap below to share more.`}
      </Text>
      <Pressable
        onPress={onOpenUpdateChat}
        style={styles.updateLink}
        accessibilityRole="link"
      >
        <Text style={styles.updateLinkText}>Update what we know ›</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>OCCASIONS</Text>
      {occasions.length === 0 ? (
        <Text style={styles.emptyText}>No occasions yet.</Text>
      ) : (
        occasions.map((occasion) => (
          <View key={occasion.id} style={styles.card}>
            <View style={styles.occasionTextBlock}>
              <Text style={styles.occasionTitle}>
                {formatOccasionType(occasion.occasion_type)}
              </Text>
              <Text style={styles.occasionDate}>
                {formatOccasionDate(occasion.date)}
              </Text>
              <Text style={styles.occasionRecurrence}>
                {occasion.is_annual ? "Repeats yearly" : "One-time"}
              </Text>
            </View>
            <Menu
              visible={openMenuId === occasion.id}
              onDismiss={() => setOpenMenuId(null)}
              anchor={
                <Pressable
                  onPress={() => setOpenMenuId(occasion.id)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Occasion options"
                  style={styles.overflowButton}
                >
                  <MaterialIcons
                    name="more-horiz"
                    size={22}
                    color={Colors.blues.dark}
                  />
                </Pressable>
              }
            >
              <Menu.Item
                onPress={() => {
                  setOpenMenuId(null);
                  setEditingOccasion(occasion);
                }}
                title="Edit"
              />
              <Menu.Item
                onPress={() => {
                  setOpenMenuId(null);
                  setOccasionToDelete(occasion);
                }}
                title="Delete"
              />
            </Menu>
          </View>
        ))
      )}

      <Text style={styles.sectionLabel}>GIFT PREFERENCES (OPTIONAL)</Text>
      <Pressable
        onPress={() => setPreferencesOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Edit gift preferences"
      >
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.fieldLabel}>EMOTIONAL TONE</Text>
            {recipient.emotional_tone_preference?.trim() ? (
              <Text style={styles.fieldValue}>
                {recipient.emotional_tone_preference.trim()}
              </Text>
            ) : defaultEmotionalTone?.trim() ? (
              <>
                <Text style={styles.fieldValue}>
                  {defaultEmotionalTone.trim()}
                </Text>
                <Text style={styles.fieldHint}>
                  Default from your profile · tap to change
                </Text>
              </>
            ) : (
              <Text style={styles.fieldValue}>—</Text>
            )}

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>MIN $ BUDGET</Text>
                <Text style={styles.fieldValue}>{budgetMin}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>MAX $ BUDGET</Text>
                <Text style={styles.fieldValue}>{budgetMax}</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>SHIPPING ADDRESS</Text>
            <Text style={styles.fieldValue}>{addressBlock || "—"}</Text>
          </View>
        </View>
      </Pressable>

      <Text style={styles.sectionLabel}>INFORMATION</Text>
      <Pressable
        onPress={() => setInformationOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Edit information"
      >
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>NAME</Text>
                <Text style={styles.fieldValue}>{recipient.name}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>RELATIONSHIP</Text>
                <Text style={styles.fieldValue}>
                  {cleanRelationship(recipient.relationship_type) || "—"}
                </Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>BIRTHDAY</Text>
            <Text style={styles.fieldValue}>
              {formatBirthdayDisplay(recipient.birthday) || "—"}
            </Text>
          </View>
        </View>
      </Pressable>

      <Button
        mode="outlined"
        textColor="#cc0000"
        icon="delete-outline"
        onPress={onDelete}
        style={styles.deleteButton}
      >
        Delete Recipient
      </Button>

      <Portal>
        <Dialog
          visible={!!occasionToDelete}
          onDismiss={() => setOccasionToDelete(null)}
          style={styles.dialog}
        >
          <Dialog.Title>
            <Text variant="bodySmall" style={styles.dialogLabel}>
              Delete Occasion
            </Text>
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="headlineSmall">
              Delete{" "}
              {occasionToDelete
                ? formatOccasionType(occasionToDelete.occasion_type)
                : ""}
              ?
            </Text>
          </Dialog.Content>
          <View style={styles.dialogActions}>
            <Button
              mode="outlined"
              onPress={() => setOccasionToDelete(null)}
              style={styles.dialogButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor="#cc0000"
              textColor="#fff"
              onPress={handleConfirmDeleteOccasion}
              loading={deleteOccasion.isPending}
              style={styles.dialogButton}
            >
              Delete
            </Button>
          </View>
        </Dialog>
      </Portal>

      {editingOccasion && (
        <OccasionEditor
          occasion={editingOccasion}
          visible={!!editingOccasion}
          onClose={() => setEditingOccasion(null)}
          onSave={(date, isAnnual) => {
            updateOccasion.mutate({
              occasionId: editingOccasion.id,
              recipientId: recipient.id,
              fields: { date, is_annual: isAnnual },
            });
          }}
        />
      )}

      <GiftPreferencesDialog
        visible={preferencesOpen}
        recipient={recipient}
        defaultEmotionalTone={defaultEmotionalTone}
        onClose={() => setPreferencesOpen(false)}
        onSave={async (fields) => {
          await handleSavePartial(fields, true);
          setPreferencesOpen(false);
        }}
      />

      <InformationDialog
        visible={informationOpen}
        recipient={recipient}
        onClose={() => setInformationOpen(false)}
        onSave={async (fields) => {
          await handleSavePartial(fields, true);
          setInformationOpen(false);
        }}
      />
    </View>
  );
};

type GiftPreferencesDialogProps = {
  visible: boolean;
  recipient: Recipient;
  defaultEmotionalTone?: string;
  onClose: () => void;
  onSave: (fields: Partial<Recipient>) => Promise<void>;
};

const GiftPreferencesDialog: React.FC<GiftPreferencesDialogProps> = ({
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

  React.useEffect(() => {
    if (visible) {
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
  }, [visible, recipient, seededTone]);

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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            <View style={styles.modalBody}>
              <TextInput
                mode="outlined"
                label="Emotional tone"
                value={tone}
                onChangeText={setTone}
                multiline
                style={styles.input}
              />
              <View style={styles.row}>
                <TextInput
                  mode="outlined"
                  label="Min $"
                  value={minBudget}
                  onChangeText={setMinBudget}
                  keyboardType="number-pad"
                  style={[styles.input, styles.budgetInput]}
                />
                <TextInput
                  mode="outlined"
                  label="Max $"
                  value={maxBudget}
                  onChangeText={setMaxBudget}
                  keyboardType="number-pad"
                  style={[styles.input, styles.budgetInput]}
                />
              </View>
              <TextInput
                mode="outlined"
                label="Address"
                value={address}
                onChangeText={setAddress}
                style={styles.input}
              />
              <TextInput
                mode="outlined"
                label="Address line 2"
                value={addressLine2}
                onChangeText={setAddressLine2}
                style={styles.input}
              />
              <View style={styles.row}>
                <TextInput
                  mode="outlined"
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  style={[styles.input, styles.budgetInput]}
                />
                <TextInput
                  mode="outlined"
                  label="State"
                  value={state}
                  onChangeText={setState}
                  style={[styles.input, styles.budgetInput]}
                />
              </View>
              <TextInput
                mode="outlined"
                label="ZIP code"
                value={zipCode}
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

type InformationDialogProps = {
  visible: boolean;
  recipient: Recipient;
  onClose: () => void;
  onSave: (fields: Partial<Recipient>) => Promise<void>;
};

const InformationDialog: React.FC<InformationDialogProps> = ({
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

  React.useEffect(() => {
    if (visible) {
      setName(recipient.name);
      setRelationshipType(cleanRelationship(recipient.relationship_type));
      setBirthday(seedBirthday(recipient.birthday));
    }
  }, [visible, recipient]);

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
          : normalizeBirthday(trimmedBirthday) ?? undefined,
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroAbout: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 36,
    lineHeight: 42,
    color: Colors.blues.dark,
  },
  heroName: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 36,
    lineHeight: 42,
    color: Colors.blues.dark,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: Colors.blues.dark,
    marginTop: 16,
    marginBottom: 10,
  },
  narrative: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.darks.black,
  },
  narrativeDimmed: {
    opacity: 0.4,
  },
  refreshingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  refreshingText: {
    fontSize: 13,
    fontStyle: "italic",
    color: Colors.blues.medium,
  },
  updateLink: {
    alignSelf: "flex-start",
    marginTop: 12,
    marginBottom: 8,
  },
  updateLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.darks.black,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  cardInner: {
    flex: 1,
  },
  occasionTextBlock: {
    flex: 1,
  },
  occasionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.blues.dark,
  },
  occasionDate: {
    fontSize: 14,
    color: Colors.yellows.orange,
    marginTop: 2,
  },
  occasionRecurrence: {
    fontSize: 12,
    color: Colors.blues.medium,
    marginTop: 2,
  },
  overflowButton: {
    padding: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: Colors.blues.medium,
    marginTop: 10,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.blues.dark,
    fontWeight: "600",
  },
  fieldHint: {
    fontSize: 12,
    fontStyle: "italic",
    color: Colors.blues.medium,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  col: {
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.darks.black,
    fontStyle: "italic",
    marginBottom: 6,
  },
  deleteButton: {
    marginTop: 28,
    marginBottom: 12,
  },
  dialog: {
    borderRadius: 16,
  },
  dialogLabel: {
    color: "#595959",
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
  },
  dialogButton: {
    minWidth: 100,
  },
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
    borderRadius: 18,
    width: "100%",
    maxWidth: 480,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e0d6c4",
  },
  // 44pt min tap target (HIG); transparent container, 24pt icon unchanged.
  modalClose: {
    margin: 0,
    width: 44,
    height: 44,
  },
  modalTitle: {
    flex: 1,
    fontFamily: "Fraunces_600SemiBold",
    color: Colors.blues.dark,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  modalFooterButton: {
    flex: 1,
  },
  input: {
    marginBottom: 12,
    backgroundColor: Colors.brand.cream,
  },
  budgetInput: {
    flex: 1,
  },
});
