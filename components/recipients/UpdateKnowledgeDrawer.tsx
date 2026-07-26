import React, { useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import { ReviewSaveStep } from "../ReviewSaveStep";

export type UpdateKnowledgeDrawerHandle = {
  present: () => void;
  dismiss: () => void;
};

type UpdateKnowledgeDrawerProps = {
  /** Step 1 (compose) title, e.g. "Update what BeGifted knows". */
  title: string;
  /** Step 2 (review) title, e.g. "Update what we know". */
  reviewTitle: string;
  /** One-line question under the compose title. */
  prompt: string;
  placeholder: string;
  /** Persist the note. Resolve true to dismiss, false to stay on review. */
  onSave: (text: string) => Promise<boolean>;
  handleRef: React.MutableRefObject<UpdateKnowledgeDrawerHandle | null>;
};

/**
 * Two-step bottom drawer for free-form profile updates (Figma 4959:2586 →
 * 4883:6125): a single-shot "Details" textarea with a Send pill, then a
 * review step that echoes the note with a Save Updates pill. The page behind
 * stays visible (no scrim, per the contextual-task drawer model), and nothing
 * persists until Save.
 */
export const UpdateKnowledgeDrawer: React.FC<UpdateKnowledgeDrawerProps> = ({
  title,
  reviewTitle,
  prompt,
  placeholder,
  onSave,
  handleRef,
}) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [step, setStep] = useState<"compose" | "review">("compose");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useImperativeHandle(handleRef, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await onSave(draft.trim());
      if (saved) sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={styles.sheetHandle}
      backgroundStyle={styles.sheetBackground}
      onDismiss={() => {
        setStep("compose");
        setDraft("");
      }}
    >
      <BottomSheetView style={styles.content}>
        {step === "compose" ? (
          <>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.prompt}>{prompt}</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Details</Text>
              <BottomSheetTextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={placeholder}
                placeholderTextColor={Colors.brand.mediumTeal}
                multiline
                style={styles.input}
              />
            </View>
            <Button
              mode="contained"
              buttonColor={Colors.brand.darkTeal}
              textColor={Colors.white}
              disabled={!draft.trim()}
              onPress={() => setStep("review")}
              style={styles.cta}
              contentStyle={styles.ctaContent}
              labelStyle={styles.ctaLabel}
            >
              Send
            </Button>
          </>
        ) : (
          <>
            <Text style={styles.title}>{reviewTitle}</Text>
            <ReviewSaveStep
              text={draft.trim()}
              saving={saving}
              onSave={handleSave}
            />
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: {
    backgroundColor: Colors.brand.beige,
    width: 58,
    height: 5,
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: Spacing.sectionHeadInset,
    // The sheet's handle row supplies ~17pt; this lands the title ≈36pt from
    // the sheet top per the frame.
    paddingTop: 12,
    paddingBottom: 40,
    gap: 22,
  },
  title: {
    ...Typography.drawerTitle,
    color: Colors.brand.darkTeal,
  },
  prompt: {
    ...Typography.body13,
    color: Colors.brand.darkTeal,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    ...Typography.fieldLabel,
    color: Colors.brand.mediumTeal,
  },
  // Square corners on purpose — the Figma field-box (input/textarea) has no
  // radius.
  input: {
    backgroundColor: Colors.brand.beigeLight,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 77,
    textAlignVertical: "top",
    ...Typography.copyblock,
    color: Colors.brand.darkTeal,
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
