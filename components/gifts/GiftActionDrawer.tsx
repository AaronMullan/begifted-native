import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Snackbar, Text, TextInput } from "react-native-paper";
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
            <>
              <View style={styles.notesHeader}>
                <Pressable
                  onPress={() => setView("root")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={22}
                    color={Colors.blues.dark}
                  />
                </Pressable>
                <Text style={styles.notesTitle}>Gift feedback</Text>
              </View>
              <Text style={styles.notesSubtitle}>
                Tell us what works or doesn&apos;t — we&apos;ll learn from it.
              </Text>
              <TextInput
                mode="outlined"
                multiline
                numberOfLines={4}
                value={note}
                onChangeText={setNote}
                placeholder="What did you think?"
                style={styles.noteInput}
                render={(props) => <BottomSheetTextInput {...props} />}
              />
              <Button
                mode="contained"
                onPress={() =>
                  handleAction("gift_feedback", note.trim() || null)
                }
                disabled={submit.isPending || !note.trim()}
                loading={submit.isPending}
              >
                Send feedback
              </Button>
            </>
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
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  notesTitle: {
    fontFamily: "Fraunces_600SemiBold",
    color: Colors.blues.dark,
    fontSize: 18,
  },
  notesSubtitle: {
    fontFamily: "RobotoFlex_400Regular",
    fontSize: 14,
    color: Colors.blues.dark,
    opacity: 0.75,
    paddingBottom: 8,
  },
  noteInput: {
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
});
