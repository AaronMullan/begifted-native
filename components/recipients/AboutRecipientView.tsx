import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Dialog,
  Menu,
  Portal,
  Text,
} from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { supabase } from "../../lib/supabase";
import type { Occasion } from "../../lib/api";
import type { Recipient } from "../../types/recipient";
import {
  useDeleteOccasion,
  useRecipientOccasions,
  useUpdateOccasion,
} from "../../hooks/use-occasion-mutations";
import { OccasionEditor } from "./conversation/OccasionEditor";
import { GiftPreferencesDialog } from "./GiftPreferencesDialog";
import { InformationDialog } from "./InformationDialog";
import { formatBirthdayDisplay } from "../../utils/birthday";
import { formatOccasionType } from "../../utils/home-occasions";
import { formatOccasionDate } from "../../utils/occasion-dates";
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroAbout: {
    ...Typography.h1,
    color: Colors.blues.dark,
  },
  heroName: {
    ...Typography.h1,
    color: Colors.blues.dark,
    marginBottom: 24,
  },
  sectionLabel: {
    ...Typography.sectionHeadAc,
    letterSpacing: 0.8,
    color: Colors.blues.dark,
    marginTop: 16,
    marginBottom: 10,
  },
  narrative: {
    ...Typography.subhead,
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
    ...Typography.eyebrow,
    fontStyle: "italic",
    color: Colors.blues.medium,
  },
  updateLink: {
    alignSelf: "flex-start",
    marginTop: 12,
    marginBottom: 8,
  },
  updateLinkText: {
    ...Typography.largeCta,
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
    ...Typography.h3,
    color: Colors.blues.dark,
  },
  occasionDate: {
    ...Typography.subhead,
    color: Colors.yellows.orange,
    marginTop: 2,
  },
  occasionRecurrence: {
    ...Typography.eyebrow,
    color: Colors.blues.medium,
    marginTop: 2,
  },
  overflowButton: {
    padding: 4,
  },
  fieldLabel: {
    ...Typography.sectionHeadAc,
    letterSpacing: 0.6,
    color: Colors.blues.medium,
    marginTop: 10,
    marginBottom: 4,
  },
  fieldValue: {
    ...Typography.subhead,
    lineHeight: 22,
    color: Colors.blues.dark,
  },
  fieldHint: {
    ...Typography.eyebrow,
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
    ...Typography.subhead,
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
});
