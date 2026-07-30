import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Snackbar, Text } from "react-native-paper";
import type { BetaCheckInScreen } from "../../lib/api";
import { useSubmitBetaFeedback } from "../../hooks/use-submit-beta-feedback";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";

export type ChipQuestion = {
  // Key this question's answer lands under in the `responses` jsonb.
  id: string;
  label: string;
  options: { value: string; label: string }[];
  multiSelect?: boolean;
  // "grid2": fixed two-row grid (options split in half), not a wrap layout.
  layout?: "wrap" | "grid2";
};

export type FreeTextQuestion = {
  label: string;
  placeholder: string;
};

export type CheckInConfig = {
  screen: BetaCheckInScreen;
  heading: string;
  subtext: string;
  // Which selected-chip treatment this modal uses (per the hand-off frames:
  // onboarding = gold, the other two = teal).
  selectedChipColor: "gold" | "teal";
  chips: ChipQuestion[];
  // At most one free-text field per screen -> maps to the single `free_text`
  // column. Absent on the onboarding check-in.
  freeText?: FreeTextQuestion;
};

type BetaFeedbackModalProps = {
  // Null while idle; non-null presents the modal.
  config: CheckInConfig | null;
  // Fired after a successful insert; the owner clears `config`.
  onSubmitted: () => void;
};

/**
 * Blocking beta-feedback modal (DEV-332, Beta_Feedback_Modals_Handoff.md):
 * a vertically centered dark card over a black scrim, dismissable only via
 * SEND FEEDBACK. All selections optional. The full dark scrim is an explicit,
 * documented exception to the app-wide no-dark-scrim rule — this system is
 * intentionally separate from standard drawers/modals.
 */
export default function BetaFeedbackModal({
  config,
  onSubmitted,
}: BetaFeedbackModalProps) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [freeText, setFreeText] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const submit = useSubmitBetaFeedback();

  const toggleAnswer = (question: ChipQuestion, value: string) => {
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.multiSelect) {
        return {
          ...prev,
          [question.id]: current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value],
        };
      }
      // Radio: tapping the selected chip clears it (everything is optional).
      return { ...prev, [question.id]: current[0] === value ? [] : [value] };
    });
  };

  const handleSend = () => {
    if (!config) return;
    // Single-select answers stay plain strings in the jsonb (stable with the
    // rows testers already submitted); only multi-selects store arrays.
    const responses: Record<string, string | string[]> = {};
    for (const question of config.chips) {
      const selected = answers[question.id] ?? [];
      if (selected.length === 0) continue;
      responses[question.id] = question.multiSelect ? selected : selected[0];
    }
    const trimmed = freeText.trim();
    submit.mutate(
      {
        screen: config.screen,
        responses,
        freeText: trimmed || null,
      },
      {
        onSuccess: () => {
          setAnswers({});
          setFreeText("");
          onSubmitted();
        },
        onError: () => setErrorVisible(true),
      }
    );
  };

  const renderChip = (
    question: ChipQuestion,
    option: ChipQuestion["options"][number]
  ) => {
    const selected = (answers[question.id] ?? []).includes(option.value);
    return (
      <Pressable
        key={option.value}
        onPress={() => toggleAnswer(question, option.value)}
        disabled={submit.isPending}
        accessibilityRole={question.multiSelect ? "checkbox" : "radio"}
        accessibilityState={{ selected }}
        accessibilityLabel={option.label}
        style={[
          styles.chip,
          selected &&
            (config?.selectedChipColor === "gold"
              ? styles.chipSelectedGold
              : styles.chipSelectedTeal),
        ]}
      >
        <Text style={styles.chipLabel}>{option.label}</Text>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={!!config}
      transparent
      animationType="fade"
      // Blocking by design: Android back does not dismiss.
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {config && (
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.eyebrow}>QUICK BETA CHECK-IN</Text>
              <Text style={styles.heading}>{config.heading}</Text>
              <Text style={styles.subtext}>{config.subtext}</Text>

              {config.chips.map((question) => (
                <View key={question.id} style={styles.question}>
                  <Text style={styles.questionLabel}>{question.label}</Text>
                  {question.layout === "grid2" ? (
                    <View style={styles.chipGrid}>
                      <View style={styles.chipGridRow}>
                        {question.options
                          .slice(0, Math.ceil(question.options.length / 2))
                          .map((option) => renderChip(question, option))}
                      </View>
                      <View style={styles.chipGridRow}>
                        {question.options
                          .slice(Math.ceil(question.options.length / 2))
                          .map((option) => renderChip(question, option))}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.chipWrap}>
                      {question.options.map((option) =>
                        renderChip(question, option)
                      )}
                    </View>
                  )}
                </View>
              ))}

              {config.freeText && (
                <View style={styles.question}>
                  <Text style={styles.questionLabel}>
                    {config.freeText.label}
                  </Text>
                  <TextInput
                    value={freeText}
                    onChangeText={setFreeText}
                    placeholder={config.freeText.placeholder}
                    placeholderTextColor={Colors.brand.lightTeal}
                    editable={!submit.isPending}
                    maxLength={200}
                    style={styles.freeTextField}
                  />
                </View>
              )}

              <Pressable
                onPress={handleSend}
                disabled={submit.isPending}
                accessibilityRole="button"
                accessibilityLabel="Send feedback"
                style={[styles.cta, submit.isPending && styles.ctaPending]}
              >
                <Text style={styles.ctaLabel}>SEND FEEDBACK</Text>
              </Pressable>
              <Text style={styles.footnote}>
                Answer this quick check-in to continue.
              </Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        duration={3000}
      >
        Could not send — please try again.
      </Snackbar>
    </Modal>
  );
}

// Geometry straight from the hand-off: card = screen − 32, radius 24 top /
// 20 bottom, 32/24 padding, 24 section spacing; chips 32px pills with 6px
// gaps; CTA 46px full-width pill; single-line square-cornered input.
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  // flexGrow 0 keeps the card centered when it fits; with the keyboard up the
  // ScrollView hits the shrunken viewport and the CTA stays reachable by
  // scrolling.
  scroll: {
    flexGrow: 0,
  },
  card: {
    backgroundColor: Colors.betaDark.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  eyebrow: {
    ...Typography.tagLabel,
    color: Colors.brand.gold,
    textAlign: "center",
    marginBottom: 24,
  },
  heading: {
    ...Typography.h2,
    color: Colors.white,
  },
  subtext: {
    ...Typography.body13,
    color: Colors.brand.mediumTeal,
    marginTop: 4,
    marginBottom: 24,
  },
  question: {
    marginBottom: 24,
  },
  questionLabel: {
    ...Typography.subhead,
    lineHeight: 20,
    color: Colors.white,
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chipGrid: {
    gap: 8,
  },
  chipGridRow: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: Colors.betaDark.chipUnselected,
    borderWidth: 1,
    borderColor: Colors.betaDark.borderSubtle,
  },
  chipSelectedGold: {
    backgroundColor: Colors.brand.gold,
    borderColor: Colors.brand.gold,
  },
  chipSelectedTeal: {
    backgroundColor: Colors.brand.darkTeal,
    borderColor: Colors.brand.darkTeal,
  },
  chipLabel: {
    ...Typography.tagLabel,
    color: Colors.white,
  },
  freeTextField: {
    height: 40,
    backgroundColor: Colors.betaDark.surfaceDark,
    borderWidth: 1,
    borderColor: Colors.betaDark.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Typography.body13,
    color: Colors.white,
  },
  cta: {
    height: 46,
    borderRadius: 24,
    backgroundColor: Colors.brand.darkTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPending: {
    opacity: 0.6,
  },
  ctaLabel: {
    ...Typography.largeCta,
    color: Colors.white,
  },
  footnote: {
    ...Typography.body13,
    color: Colors.brand.mediumTeal,
    textAlign: "center",
    marginTop: 16,
  },
});
