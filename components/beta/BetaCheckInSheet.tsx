import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Snackbar, Text } from "react-native-paper";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { AppDrawer } from "../AppDrawer";
import type { BetaCheckInScreen } from "../../lib/api";
import { useSubmitBetaFeedback } from "../../hooks/use-submit-beta-feedback";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";

export type RadioQuestion = {
  // Key this question's answer lands under in the `responses` jsonb.
  id: string;
  label: string;
  options: { value: string; label: string }[];
};

export type FreeTextQuestion = {
  label: string;
  placeholder: string;
};

export type CheckInConfig = {
  screen: BetaCheckInScreen;
  heading: string;
  subtext: string;
  radios: RadioQuestion[];
  // At most one free-text field per screen -> maps to the single `free_text`
  // column. Absent on the onboarding check-in.
  freeText?: FreeTextQuestion;
};

type BetaCheckInSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  // Null while idle: the modal stays mounted so present() works, but renders no
  // content until the provider sets the active check-in.
  config: CheckInConfig | null;
  // Fired after a successful insert (before the sheet closes).
  onSubmitted: () => void;
  // Fired whenever the sheet closes for any reason (swipe, backdrop, or submit).
  // The trigger owner marks the check-in seen here so a dismiss-without-answer
  // still never re-shows -- each check-in fires once.
  onDismiss: () => void;
};

/**
 * The "quick beta check-in" card (DEV-191): a dismissable dark-card bottom sheet
 * that fires once at a moment in the core flow. Radio pills answer structured
 * questions; an optional one-line free-text field feeds the `free_text` column.
 * Content is entirely config-driven so the three moments share one component.
 *
 * Not blocking: the "Answer this quick check-in to continue" copy is aspirational
 * -- swiping down or tapping the backdrop dismisses without answering.
 */
export default function BetaCheckInSheet({
  sheetRef,
  config,
  onSubmitted,
  onDismiss,
}: BetaCheckInSheetProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const submit = useSubmitBetaFeedback();

  const reset = () => {
    setAnswers({});
    setFreeText("");
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  const handleSend = () => {
    if (!config) return;
    const trimmed = freeText.trim();
    submit.mutate(
      {
        screen: config.screen,
        responses: answers,
        freeText: trimmed || null,
      },
      {
        onSuccess: () => {
          onSubmitted();
          sheetRef.current?.dismiss();
        },
        onError: () => setErrorVisible(true),
      }
    );
  };

  return (
    <>
      <AppDrawer
        sheetRef={sheetRef}
        onDismiss={handleDismiss}
        backgroundStyle={styles.background}
        contentContainerStyle={styles.content}
      >
        {config && (
          <>
            <Text style={styles.eyebrow}>Quick beta check-in</Text>
            <Text style={styles.heading}>{config.heading}</Text>
            <Text style={styles.subtext}>{config.subtext}</Text>

            {config.radios.map((question) => (
              <View key={question.id} style={styles.question}>
                <Text style={styles.questionLabel}>{question.label}</Text>
                <View style={styles.pills}>
                  {question.options.map((option) => {
                    const selected = answers[question.id] === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [question.id]: option.value,
                          }))
                        }
                        disabled={submit.isPending}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={option.label}
                        style={[styles.pill, selected && styles.pillSelected]}
                      >
                        <Text style={styles.pillLabel}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            {config.freeText && (
              <View style={styles.question}>
                <Text style={styles.questionLabel}>
                  {config.freeText.label}
                </Text>
                <BottomSheetTextInput
                  value={freeText}
                  onChangeText={setFreeText}
                  placeholder={config.freeText.placeholder}
                  placeholderTextColor={Colors.brand.beige}
                  editable={!submit.isPending}
                  style={styles.freeTextField}
                />
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleSend}
              loading={submit.isPending}
              disabled={submit.isPending}
              buttonColor={Colors.brand.gold}
              textColor={Colors.white}
              style={styles.cta}
              contentStyle={styles.ctaContent}
              labelStyle={styles.ctaLabel}
            >
              Send feedback
            </Button>
            <Text style={styles.footnote}>
              Answer this quick check-in to continue.
            </Text>
          </>
        )}
      </AppDrawer>
      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        duration={3000}
      >
        Could not send — please try again.
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  // Dark card: the design fills the sheet body with near-black behind white text.
  background: {
    backgroundColor: Colors.black,
  },
  content: {
    paddingHorizontal: 26,
    paddingTop: 12,
    paddingBottom: 32,
  },
  // Uppercase gold micro-label (design "sectionHeadAc"); the token owns the
  // uppercasing.
  eyebrow: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.gold,
    textAlign: "center",
    marginBottom: 16,
  },
  heading: {
    ...Typography.subhead,
    lineHeight: 20,
    color: Colors.white,
    marginBottom: 6,
  },
  subtext: {
    ...Typography.largeCta,
    color: Colors.brand.mediumTeal,
    marginBottom: 24,
  },
  question: {
    marginBottom: 24,
  },
  questionLabel: {
    ...Typography.largeCta,
    color: Colors.white,
    marginBottom: 12,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  // Dark-teal pill; selected adds the 2px gold ring from the design. Fixed 34pt
  // height matches the frame; the transparent default border keeps selected and
  // unselected the same size so selecting one doesn't reflow the row.
  pill: {
    height: 34,
    borderRadius: 24,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: Colors.brand.darkTeal,
    borderWidth: 2,
    borderColor: "transparent",
  },
  pillSelected: {
    borderColor: Colors.brand.gold,
  },
  pillLabel: {
    ...Typography.largeCta,
    color: Colors.white,
  },
  freeTextField: {
    minHeight: 82,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    ...Typography.eyebrow,
    color: Colors.brand.darkTeal,
    textAlignVertical: "top",
  },
  cta: {
    alignSelf: "center",
    borderRadius: 24,
    marginTop: 8,
  },
  ctaContent: {
    height: 40,
    width: 170,
  },
  // Uppercase semibold micro-label matches the design's CTA text.
  ctaLabel: {
    ...Typography.sectionHeadAc,
  },
  footnote: {
    ...Typography.largeCta,
    color: Colors.brand.mediumTeal,
    textAlign: "center",
    marginTop: 16,
  },
});
