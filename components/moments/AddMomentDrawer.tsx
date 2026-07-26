import React, { useImperativeHandle, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";

export type AddMomentDrawerHandle = {
  present: () => void;
  dismiss: () => void;
};

type AddMomentDrawerProps = {
  /** Persist the chosen moment name; resolve true to dismiss. */
  onSave: (momentName: string) => Promise<boolean>;
  saving: boolean;
  handleRef: React.MutableRefObject<AddMomentDrawerHandle | null>;
};

// Chip sets from the frame (5200:4525). Recommended chips render filled,
// common ones outlined; tapping either drops the label into the Moment Name
// field (the field is the single source of what gets saved).
const RECOMMENDED_MOMENTS = ["Birthday", "Anniversary"];
const COMMON_MOMENTS = [
  "Graduation",
  "Wedding",
  "New Baby",
  "Promotion",
  "Holiday",
  "Get Well Soon",
  "Housewarming",
  "Retirement",
];

/**
 * "Add a Moment" drawer for a picked person + day (Figma 5200:4525):
 * recommended/common occasion chips plus a free-form Moment Name, saved with
 * the darkTeal Add Moment pill. Replaces the inline RN-Modal occasion entry.
 */
export const AddMomentDrawer: React.FC<AddMomentDrawerProps> = ({
  onSave,
  saving,
  handleRef,
}) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [momentName, setMomentName] = useState("");

  useImperativeHandle(handleRef, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    const name = momentName.trim();
    if (!name || saving) return;
    const saved = await onSave(name);
    if (saved) sheetRef.current?.dismiss();
  };

  const chip = (label: string, filled: boolean) => (
    <Pressable
      key={label}
      onPress={() => setMomentName(label)}
      accessibilityRole="button"
      accessibilityLabel={`Use ${label}`}
      style={[styles.chip, filled ? styles.chipFilled : styles.chipOutlined]}
    >
      <Text style={filled ? styles.chipLabelFilled : styles.chipLabelOutlined}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={styles.sheetHandle}
      backgroundStyle={styles.sheetBackground}
      onDismiss={() => setMomentName("")}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Add a Moment</Text>
        <Text style={styles.subtitle}>
          Pick from recommended occasions, common ones, or add your own.
        </Text>
        <Text style={styles.sectionLabel}>RECOMMENDED</Text>
        <View style={styles.chipRow}>
          {RECOMMENDED_MOMENTS.map((label) => chip(label, true))}
        </View>
        <Text style={styles.sectionLabel}>COMMON MOMENTS</Text>
        <View style={styles.chipRow}>
          {COMMON_MOMENTS.map((label) => chip(label, false))}
        </View>
        <Text style={styles.sectionLabel}>ADD YOUR OWN</Text>
        <Text style={styles.fieldLabel}>Moment Name</Text>
        <BottomSheetTextInput
          value={momentName}
          onChangeText={setMomentName}
          placeholder="e.g. New Job, Anniversary..."
          placeholderTextColor={Colors.brand.mediumTeal}
          autoCapitalize="words"
          style={styles.input}
        />
        <Button
          mode="contained"
          buttonColor={Colors.brand.darkTeal}
          textColor={Colors.white}
          onPress={handleSave}
          loading={saving}
          disabled={!momentName.trim() || saving}
          style={styles.cta}
          contentStyle={styles.ctaContent}
          labelStyle={styles.ctaLabel}
        >
          Add Moment
        </Button>
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
    paddingTop: 12,
    paddingBottom: 34,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  subtitle: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
    marginTop: 9,
  },
  sectionLabel: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.mediumTeal,
    marginTop: 24,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  chipFilled: {
    backgroundColor: Colors.brand.darkTeal,
  },
  chipOutlined: {
    borderWidth: 1,
    borderColor: Colors.brand.lightTeal,
    backgroundColor: Colors.white,
  },
  chipLabelFilled: {
    ...Typography.tagLabel,
    color: Colors.white,
  },
  chipLabelOutlined: {
    ...Typography.tagLabel,
    color: Colors.brand.darkTeal,
  },
  fieldLabel: {
    ...Typography.fieldLabel,
    color: Colors.brand.mediumTeal,
    marginBottom: 8,
  },
  // Square corners on purpose — input/text-field carries no radius.
  input: {
    backgroundColor: Colors.brand.beigeLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 42,
    ...Typography.copyblock,
    color: Colors.brand.darkTeal,
  },
  cta: {
    alignSelf: "center",
    width: 170,
    borderRadius: 24,
    marginTop: 28,
  },
  ctaContent: {
    height: 46,
  },
  ctaLabel: {
    ...Typography.largeCta,
  },
});
