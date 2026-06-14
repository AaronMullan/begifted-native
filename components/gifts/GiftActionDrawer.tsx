import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Snackbar, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
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
import { FontFamily } from "../../lib/typography";

export type GiftActionDrawerState = {
  suggestion: GiftSuggestion;
  occasionId: string | null;
};

type GiftActionDrawerProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  state: GiftActionDrawerState | null;
  onDismiss: () => void;
};

type RowDef = {
  label: string;
  action: GiftFeedbackAction;
};

const ROWS: RowDef[] = [
  { label: "Keep this in the mix", action: "keep_in_mix" },
  { label: "I chose this gift", action: "chose" },
  { label: "They already have this", action: "already_have" },
  { label: "Not for them", action: "not_for_them" },
  { label: "Price feels off", action: "price_off" },
  { label: "Product problem", action: "product_problem" },
  { label: "Remove this idea", action: "remove" },
];

export default function GiftActionDrawer({
  sheetRef,
  state,
  onDismiss,
}: GiftActionDrawerProps) {
  const [view, setView] = useState<"root" | "notes">("root");
  const [note, setNote] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const submit = useSubmitGiftFeedback();

  const handleAction = (
    action: GiftFeedbackAction,
    notes: string | null = null
  ) => {
    if (!state) return;
    submit.mutate(
      {
        recipientId: state.suggestion.recipient_id,
        giftSuggestionId: state.suggestion.id,
        occasionId: state.occasionId ?? state.suggestion.occasion_id ?? null,
        action,
        notes,
      },
      {
        onSuccess: () => sheetRef.current?.dismiss(),
        onError: () => setErrorVisible(true),
      }
    );
  };

  const handleDismiss = () => {
    setView("root");
    setNote("");
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
          {view === "root" ? (
            <>
              {state?.suggestion.title && (
                <Text style={styles.title} numberOfLines={1}>
                  {state.suggestion.title}
                </Text>
              )}
              {ROWS.map((row) => (
                <Pressable
                  key={row.action}
                  onPress={() => handleAction(row.action)}
                  disabled={submit.isPending}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={row.label}
                >
                  <View style={styles.bullet} />
                  <Text style={styles.rowLabel}>{row.label}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setView("notes")}
                disabled={submit.isPending}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Gift feedback"
              >
                <View style={styles.bullet} />
                <Text style={styles.rowLabel}>Gift feedback</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.brand.darkTeal}
                  style={styles.chevron}
                />
              </Pressable>
            </>
          ) : (
            <View style={styles.notesInputWrap}>
              <BottomSheetTextInput
                value={note}
                onChangeText={setNote}
                placeholder="Tell us about your gift feedback"
                placeholderTextColor={Colors.brand.mediumTeal}
                multiline
                editable={!submit.isPending}
                style={styles.notesField}
              />
              <Pressable
                onPress={() =>
                  handleAction("gift_feedback", note.trim() || null)
                }
                disabled={submit.isPending || !note.trim()}
                style={({ pressed }) => [
                  styles.sendButton,
                  (submit.isPending || !note.trim()) &&
                    styles.sendButtonDisabled,
                  pressed && styles.sendButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send feedback"
              >
                <MaterialIcons name="send" size={16} color={Colors.white} />
              </Pressable>
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
    fontFamily: FontFamily.sans.medium,
    color: Colors.brand.mediumTeal,
    fontSize: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.6,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.brand.beige,
  },
  rowLabel: {
    flex: 1,
    fontFamily: FontFamily.sans.regular,
    fontSize: 12,
    lineHeight: 24,
    color: Colors.brand.darkTeal,
  },
  chevron: {
    marginLeft: "auto",
    opacity: 0.6,
  },
  notesInputWrap: {
    position: "relative",
    marginTop: 4,
  },
  notesField: {
    height: 144,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.brand.mediumTeal,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 52,
    fontFamily: FontFamily.sans.regular,
    fontSize: 11,
    color: Colors.brand.darkTeal,
    textAlignVertical: "top",
  },
  sendButton: {
    position: "absolute",
    right: 11,
    bottom: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.brand.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonPressed: {
    opacity: 0.7,
  },
});
