import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";

type ReviewSaveStepProps = {
  /** The note the user composed, shown back verbatim for confirmation. */
  text: string;
  saving: boolean;
  onSave: () => void;
};

/**
 * Step 2 of the compose→review drawer pattern (Figma 4883:6125 / 5337:9597):
 * the submitted note echoed in a beigeLight box above a "Save Updates" pill.
 * Nothing persists until the pill is pressed — the caller owns the write.
 */
export const ReviewSaveStep: React.FC<ReviewSaveStepProps> = ({
  text,
  saving,
  onSave,
}) => (
  <View style={styles.container}>
    <View style={styles.answerBox}>
      <Text style={styles.answerText}>{text}</Text>
    </View>
    <Button
      mode="contained"
      buttonColor={Colors.brand.darkTeal}
      textColor={Colors.white}
      onPress={onSave}
      loading={saving}
      disabled={saving}
      style={styles.cta}
      contentStyle={styles.ctaContent}
      labelStyle={styles.ctaLabel}
    >
      Save Updates
    </Button>
  </View>
);

// The answer box is deliberately square-cornered: the Figma component
// ("Conversation/Answer Pill", 4885:6193) carries no corner radius, matching
// the input/textarea field-box it echoes.
const styles = StyleSheet.create({
  container: {
    gap: 22,
  },
  answerBox: {
    backgroundColor: Colors.brand.beigeLight,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 64,
  },
  answerText: {
    ...Typography.body13,
    color: Colors.brand.darkTeal,
    opacity: 0.7,
  },
  cta: {
    alignSelf: "center",
    width: 170,
    borderRadius: 24,
  },
  ctaContent: {
    height: 46,
  },
  ctaLabel: {
    ...Typography.largeCta,
  },
});
