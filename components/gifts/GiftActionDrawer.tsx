import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Chip, Snackbar, Text } from "react-native-paper";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type { GiftSuggestion } from "../../types/recipient";
import type { GiftFeedbackAction } from "../../lib/api";
import { useSubmitGiftFeedback } from "../../hooks/use-submit-gift-feedback";
import { Colors } from "../../lib/colors";
import { FontFamily, Typography } from "../../lib/typography";

export type GiftActionDrawerState = {
  suggestion: GiftSuggestion;
  occasionId: string | null;
};

type GiftActionDrawerProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  state: GiftActionDrawerState | null;
  onDismiss: () => void;
};

type FollowUp = {
  // Question shown above the input once the base action is saved.
  prompt: string;
  placeholder: string;
  // price_off offers quick-choice chips alongside the optional text.
  chips?: string[];
};

type RowDef = {
  label: string;
  action: GiftFeedbackAction;
  // Figma state 1 renders the default action ("Keep this in the mix") in a
  // heavier weight than the rest of the list.
  emphasized?: boolean;
  // Absent = the tap is the whole interaction (keep_in_mix). Present = after the
  // base action saves, offer an always-optional follow-up the user can Skip.
  followUp?: FollowUp;
};

const ROWS: RowDef[] = [
  { label: "Keep this in the mix", action: "keep_in_mix", emphasized: true },
  {
    label: "I chose this gift",
    action: "chose",
    followUp: {
      prompt: "What made this feel right?",
      placeholder: "A word or two is fine.",
    },
  },
  {
    label: "They already have this",
    action: "already_have",
    followUp: {
      prompt: "What do they already have?",
      placeholder: "Exact item, something similar, or anything helpful.",
    },
  },
  {
    label: "Not for them",
    action: "not_for_them",
    followUp: {
      prompt: "What felt off?",
      placeholder:
        "Style, interest, tone, usefulness — whatever comes to mind.",
    },
  },
  {
    label: "Price feels off",
    action: "price_off",
    followUp: {
      prompt: "What's off about the price?",
      placeholder: "Add more detail",
      chips: [
        "Too expensive",
        "Too cheap",
        "Not worth the price",
        "Budget changed",
      ],
    },
  },
  {
    label: "Product problem",
    action: "product_problem",
    followUp: {
      prompt: "What went wrong?",
      placeholder: "Tell us what happened. I'll sort it out.",
    },
  },
];

export default function GiftActionDrawer({
  sheetRef,
  state,
  onDismiss,
}: GiftActionDrawerProps) {
  // Once a base action with a follow-up is saved, the drawer stays open on its
  // follow-up screen; `activeRow` is the row whose follow-up is showing.
  const [activeRow, setActiveRow] = useState<RowDef | null>(null);
  const [note, setNote] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const submit = useSubmitGiftFeedback();

  // Save the base signal on tap. For rows with a follow-up, keep the sheet open
  // and switch to the follow-up screen; otherwise the tap completes the flow.
  const handleRowPress = (row: RowDef) => {
    if (!state) return;
    submit.mutate(
      {
        recipientId: state.suggestion.recipient_id,
        giftSuggestionId: state.suggestion.id,
        occasionId: state.occasionId ?? state.suggestion.occasion_id ?? null,
        action: row.action,
        notes: null,
      },
      {
        onSuccess: () => {
          if (row.followUp) {
            setActiveRow(row);
          } else {
            sheetRef.current?.dismiss();
          }
        },
        onError: () => setErrorVisible(true),
      }
    );
  };

  // Append the optional detail as a free-text row so it routes to the
  // `free_text_feedback` signal rather than re-emitting the base action's signal.
  // Empty input is treated as Skip — the base action already saved on tap.
  const handleFollowUpDone = () => {
    if (!state) return;
    const detail = note.trim();
    const notes = selectedChip
      ? detail
        ? `${selectedChip} — ${detail}`
        : selectedChip
      : detail || null;
    if (!notes) {
      sheetRef.current?.dismiss();
      return;
    }
    submit.mutate(
      {
        recipientId: state.suggestion.recipient_id,
        giftSuggestionId: state.suggestion.id,
        occasionId: state.occasionId ?? state.suggestion.occasion_id ?? null,
        action: "gift_feedback",
        notes,
      },
      {
        onSuccess: () => sheetRef.current?.dismiss(),
        onError: () => setErrorVisible(true),
      }
    );
  };

  const handleDismiss = () => {
    setActiveRow(null);
    setNote("");
    setSelectedChip(null);
    onDismiss();
  };

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        onDismiss={handleDismiss}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
          />
        )}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.background}
      >
        <BottomSheetView style={styles.content}>
          {!activeRow ? (
            <>
              {state?.suggestion.title && (
                <Text style={styles.title} numberOfLines={1}>
                  {state.suggestion.title}
                </Text>
              )}
              {ROWS.map((row) => (
                <Pressable
                  key={row.action}
                  onPress={() => handleRowPress(row)}
                  disabled={submit.isPending}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={row.label}
                >
                  <Text
                    style={[
                      styles.rowLabel,
                      row.emphasized && styles.rowLabelEmphasized,
                    ]}
                  >
                    {row.label}
                  </Text>
                </Pressable>
              ))}
            </>
          ) : (
            <View style={styles.followUp}>
              <Text style={styles.prompt}>{activeRow.followUp?.prompt}</Text>
              {activeRow.followUp?.chips && (
                <View style={styles.chips}>
                  {activeRow.followUp.chips.map((chip) => (
                    <Chip
                      key={chip}
                      selected={selectedChip === chip}
                      onPress={() =>
                        setSelectedChip((prev) => (prev === chip ? null : chip))
                      }
                      disabled={submit.isPending}
                      showSelectedCheck={false}
                      style={[
                        styles.chip,
                        selectedChip === chip && styles.chipSelected,
                      ]}
                      textStyle={[
                        styles.chipText,
                        selectedChip === chip && styles.chipTextSelected,
                      ]}
                    >
                      {chip}
                    </Chip>
                  ))}
                </View>
              )}
              <BottomSheetTextInput
                value={note}
                onChangeText={setNote}
                placeholder={activeRow.followUp?.placeholder}
                placeholderTextColor={Colors.brand.mediumTeal}
                multiline
                editable={!submit.isPending}
                style={styles.notesField}
              />
              <View style={styles.actions}>
                <Button
                  mode="text"
                  onPress={() => sheetRef.current?.dismiss()}
                  disabled={submit.isPending}
                  textColor={Colors.brand.mediumTeal}
                >
                  Skip
                </Button>
                <Button
                  mode="contained"
                  onPress={handleFollowUpDone}
                  loading={submit.isPending}
                  disabled={submit.isPending}
                  buttonColor={Colors.brand.darkTeal}
                >
                  Done
                </Button>
              </View>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        duration={3000}
      >
        Could not save — please try again.
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  handle: {
    backgroundColor: Colors.brand.beige,
    width: 58,
    height: 5,
    borderRadius: 4,
  },
  background: {
    backgroundColor: Colors.white,
  },
  title: {
    ...Typography.subhead,
    color: Colors.brand.mediumTeal,
    paddingBottom: 16,
  },
  // 44pt min tap target (HIG) so adjacent options are unambiguous to tap; the
  // label keeps its 24pt line-height and sits centered in the taller row.
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowLabel: {
    ...Typography.eyebrow,
    lineHeight: 24,
    color: Colors.brand.darkTeal,
  },
  rowLabelEmphasized: {
    fontFamily: FontFamily.sans.semibold,
  },
  followUp: {
    marginTop: 4,
    gap: 16,
  },
  prompt: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.brand.beigeLight,
    borderColor: Colors.brand.mediumTeal,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: Colors.brand.darkTeal,
  },
  chipText: {
    ...Typography.eyebrow,
    color: Colors.brand.darkTeal,
  },
  chipTextSelected: {
    color: Colors.white,
  },
  notesField: {
    height: 120,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.brand.mediumTeal,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    ...Typography.eyebrow,
    color: Colors.brand.darkTeal,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
});
