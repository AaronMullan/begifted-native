import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type { GiftSuggestion } from "../../types/recipient";
import type { GiftFeedbackAction } from "../../lib/api";
import { useSubmitGiftFeedback } from "../../hooks/use-submit-gift-feedback";
import { Colors } from "../../lib/colors";

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
  icon: keyof typeof MaterialIcons.glyphMap;
  action: GiftFeedbackAction;
  positive?: boolean;
};

const ROWS: RowDef[] = [
  {
    label: "Keep this in the mix",
    icon: "bookmark-border",
    action: "keep_in_mix",
  },
  {
    label: "I chose this gift",
    icon: "check-circle-outline",
    action: "chose",
    positive: true,
  },
  {
    label: "They already have this",
    icon: "redo",
    action: "already_have",
  },
  {
    label: "Not for them",
    icon: "thumb-down-off-alt",
    action: "not_for_them",
  },
  {
    label: "Price feels off",
    icon: "attach-money",
    action: "price_off",
  },
  {
    label: "Product problem",
    icon: "report-gmailerrorred",
    action: "product_problem",
  },
  {
    label: "Remove this idea",
    icon: "close",
    action: "remove",
  },
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
                  <MaterialIcons
                    name={row.icon}
                    size={22}
                    color={row.positive ? Colors.blues.teal : Colors.blues.dark}
                  />
                  <Text
                    style={[
                      styles.rowLabel,
                      row.positive && styles.rowLabelPositive,
                    ]}
                  >
                    {row.label}
                  </Text>
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
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={22}
                  color={Colors.blues.dark}
                />
                <Text style={styles.rowLabel}>Gift feedback</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.blues.dark}
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 4,
  },
  handle: {
    backgroundColor: Colors.blues.dark,
    opacity: 0.4,
  },
  background: {
    backgroundColor: Colors.white,
  },
  title: {
    fontFamily: "Fraunces_600SemiBold",
    color: Colors.blues.dark,
    fontSize: 18,
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowLabel: {
    flex: 1,
    fontFamily: "RobotoFlex_400Regular",
    fontSize: 16,
    color: Colors.blues.dark,
  },
  rowLabelPositive: {
    fontWeight: "600",
    color: Colors.blues.teal,
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
