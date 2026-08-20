import React, { useImperativeHandle, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import {
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import type {
  BottomSheetFooterProps,
  BottomSheetScrollViewMethods,
} from "@gorhom/bottom-sheet";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import { slugifyOccasionName } from "../../hooks/use-occasion-recommendations";
import {
  formatOccasionDate,
  getNextOccurrence,
  isValidMonthDay,
  lookupOccasionDate,
} from "../../utils/occasion-dates";

export type AddMomentDrawerHandle = {
  present: () => void;
  dismiss: () => void;
};

type AddMomentDrawerProps = {
  /**
   * Persist the chosen moment; resolve true to dismiss. `date` is ISO, or
   * null when the drawer isn't capturing dates (`captureDate` off).
   */
  onSave: (momentName: string, date: string | null) => Promise<boolean>;
  saving: boolean;
  handleRef: React.MutableRefObject<AddMomentDrawerHandle | null>;
  /** Section label above the recommended chips, e.g. "RECOMMENDED FOR ARNOLD". */
  recommendedLabel?: string;
  /**
   * Person-specific chips (see utils/recommended-moments.ts). An empty array
   * hides the recommended section entirely.
   */
  recommendedMoments?: string[];
  /**
   * Capture a date with the moment: known holidays resolve automatically
   * (Mother's Day → next 2nd Sunday of May), anything else requires an MM-DD
   * entry before saving. Off for entry points that already picked a day
   * (the calendar).
   */
  captureDate?: boolean;
  /**
   * Extra date resolutions for suggested chips (slugified name → ISO date),
   * consulted before the local holiday catalog — interest-derived occasions
   * (Record Store Day, …) aren't in it, but their server-resolved dates are
   * already known and shouldn't cost the user an MM-DD entry.
   */
  suggestionDates?: Record<string, string>;
};

const MONTH_DAY_RE = /^\d{2}-\d{2}$/;

/** ISO date for a valid MM-DD entry (rolled to its next occurrence), else null. */
function parseEnteredMonthDay(input: string): string | null {
  const trimmed = input.trim();
  if (!MONTH_DAY_RE.test(trimmed)) return null;
  const [month, day] = trimmed.split("-").map(Number);
  if (!isValidMonthDay(month, day)) return null;
  return getNextOccurrence(`--${trimmed}`);
}

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

type MomentDateSectionProps = {
  momentName: string;
  dateInput: string;
  dateError: string;
  onDateChange: (text: string) => void;
  onDateFocus: () => void;
  suggestionDates: Record<string, string>;
};

// Date capture under the Moment Name field: a name matching a suggested chip
// or a known holiday (fixed or floating) shows its auto-resolved next
// occurrence; anything else gets a required MM-DD entry.
const MomentDateSection: React.FC<MomentDateSectionProps> = ({
  momentName,
  dateInput,
  dateError,
  onDateChange,
  onDateFocus,
  suggestionDates,
}) => {
  const slug = slugifyOccasionName(momentName);
  const knownDate = suggestionDates[slug] ?? lookupOccasionDate(slug);
  return (
    <>
      <View style={styles.fieldGap} />
      <Text style={styles.fieldLabel}>Date</Text>
      {knownDate ? (
        <Text style={styles.resolvedDate}>
          {formatOccasionDate(knownDate)} — set automatically
        </Text>
      ) : (
        <BottomSheetTextInput
          value={dateInput}
          onChangeText={onDateChange}
          onFocus={onDateFocus}
          placeholder="MM-DD"
          placeholderTextColor={Colors.brand.mediumTeal}
          keyboardType="number-pad"
          maxLength={5}
          style={styles.input}
        />
      )}
      {!!dateError && <Text style={styles.errorText}>{dateError}</Text>}
    </>
  );
};

/**
 * "Add a Moment" drawer for a picked person + day (Figma 5200:4525):
 * recommended/common occasion chips plus a free-form Moment Name, saved with
 * the darkTeal Add Moment pill. Replaces the inline RN-Modal occasion entry.
 */
export const AddMomentDrawer: React.FC<AddMomentDrawerProps> = ({
  onSave,
  saving,
  handleRef,
  recommendedLabel = "RECOMMENDED",
  recommendedMoments = RECOMMENDED_MOMENTS,
  captureDate = false,
  suggestionDates = {},
}) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const [momentName, setMomentName] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [dateError, setDateError] = useState("");

  // The date field is the last item and its number-pad has no "Done" key, so on
  // focus scroll to the end — gorhom only auto-scrolls to just above the
  // keyboard, which leaves the field behind the pinned footer CTA. The delay
  // lets the keyboard's resize settle before we scroll.
  const handleDateFocus = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  };

  useImperativeHandle(handleRef, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const trimmedName = momentName.trim();

  const handleNameChange = (text: string) => {
    setMomentName(text);
    setDateError("");
  };

  const handleDateChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    setDateInput(
      digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits
    );
    setDateError("");
  };

  const handleSave = async () => {
    if (!trimmedName || saving) return;
    let date: string | null = null;
    if (captureDate) {
      const slug = slugifyOccasionName(trimmedName);
      date =
        suggestionDates[slug] ??
        lookupOccasionDate(slug) ??
        parseEnteredMonthDay(dateInput);
      if (!date) {
        setDateError("Please enter the month and day in MM-DD format");
        return;
      }
    }
    const saved = await onSave(trimmedName, date);
    if (saved) sheetRef.current?.dismiss();
  };

  const chip = (label: string, filled: boolean) => (
    <Pressable
      key={label}
      onPress={() => handleNameChange(label)}
      accessibilityRole="button"
      accessibilityLabel={`Use ${label}`}
      style={[styles.chip, filled ? styles.chipFilled : styles.chipOutlined]}
    >
      <Text style={filled ? styles.chipLabelFilled : styles.chipLabelOutlined}>
        {label}
      </Text>
    </Pressable>
  );

  // Pin the CTA in a footer so it — and the focused field just above it — stay
  // above the number-pad, which has no "Done" key to dismiss it. A plain
  // BottomSheetView left the date field and this button behind the keyboard.
  const renderFooter = (props: BottomSheetFooterProps) => (
    <BottomSheetFooter {...props}>
      <View style={styles.footer}>
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
      </View>
    </BottomSheetFooter>
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
      footerComponent={renderFooter}
      onDismiss={() => {
        setMomentName("");
        setDateInput("");
        setDateError("");
      }}
    >
      <BottomSheetScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableFooterMarginAdjustment
      >
        <Text style={styles.title}>Add a Moment</Text>
        <Text style={styles.subtitle}>
          Pick from recommended occasions, common ones, or add your own.
        </Text>
        {recommendedMoments.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{recommendedLabel}</Text>
            <View style={styles.chipRow}>
              {recommendedMoments.map((label) => chip(label, true))}
            </View>
          </>
        )}
        <Text style={styles.sectionLabel}>COMMON MOMENTS</Text>
        <View style={styles.chipRow}>
          {COMMON_MOMENTS.map((label) => chip(label, false))}
        </View>
        <Text style={styles.sectionLabel}>ADD YOUR OWN</Text>
        <Text style={styles.fieldLabel}>Moment Name</Text>
        <BottomSheetTextInput
          value={momentName}
          onChangeText={handleNameChange}
          placeholder="e.g. New Job, Anniversary..."
          placeholderTextColor={Colors.brand.mediumTeal}
          autoCapitalize="words"
          style={styles.input}
        />
        {captureDate && !!trimmedName && (
          <MomentDateSection
            momentName={trimmedName}
            dateInput={dateInput}
            dateError={dateError}
            onDateChange={handleDateChange}
            onDateFocus={handleDateFocus}
            suggestionDates={suggestionDates}
          />
        )}
      </BottomSheetScrollView>
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
  footer: {
    paddingHorizontal: Spacing.sectionHeadInset,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: Colors.white,
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
  fieldGap: {
    height: 12,
  },
  resolvedDate: {
    ...Typography.copyblock,
    color: Colors.brand.darkTeal,
    paddingVertical: 12,
  },
  errorText: {
    ...Typography.fieldLabel,
    color: Colors.brand.rose,
    marginTop: 8,
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
