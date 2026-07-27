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
import type { Occasion } from "../../lib/api";
import { formatOccasionType } from "../../utils/home-occasions";
import {
  formatOccasionDate,
  getNextOccurrence,
} from "../../utils/occasion-dates";

export type ManageMomentDrawerHandle = {
  present: () => void;
  dismiss: () => void;
};

type ManageMomentDrawerProps = {
  /** The moment being edited; null until one is picked. */
  occasion: Occasion | null;
  /**
   * Persist edits. `date` is ISO, or "" meaning "leave the stored date alone"
   * (the date column rejects "" and a NULL would vanish from the calendar).
   */
  onSave: (date: string, name: string, isAnnual: boolean) => void;
  onDelete: (occasion: Occasion) => void;
  handleRef: React.MutableRefObject<ManageMomentDrawerHandle | null>;
};

const FULL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// One-time dates are ENTERED month-day-year (US-customary) but STORED as ISO.
const MDY_RE = /^\d{2}-\d{2}-\d{4}$/;
const MONTH_DAY_RE = /^\d{2}-\d{2}$/;

function mdyToISO(mdy: string): string {
  const [month, day, year] = mdy.split("-");
  return `${year}-${month}-${day}`;
}

function isoToMDY(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}-${day}-${year}`;
}

/** True if the given 1-based month and day form a real calendar date. */
function isValidMonthDay(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Use a leap year so Feb 29 is accepted for annual occasions.
  const probe = new Date(2024, month - 1, day);
  return probe.getMonth() === month - 1 && probe.getDate() === day;
}

function seedDateInput(occasion: Occasion): string {
  const annual = occasion.is_annual ?? true;
  // Jan-1 dates are placeholder values from the AI extractor, not real input.
  const hasRealDate =
    occasion.date && !occasion.date.includes("01-01") ? occasion.date : "";
  if (!hasRealDate) return "";
  if (annual && FULL_DATE_RE.test(hasRealDate)) {
    // Annual occasions ignore the year — show just month-day.
    return hasRealDate.slice(5);
  }
  if (FULL_DATE_RE.test(hasRealDate)) return isoToMDY(hasRealDate);
  return hasRealDate;
}

/**
 * "Manage Moment" bottom drawer (Figma 4909:6406): occasion name + date fields
 * with a Save Changes pill and a rose Delete Moment action. Replaces the
 * centered RN-Modal OccasionEditor on People Details. The Figma frame carries
 * no recurrence control, but repeats-yearly vs. one-time is a live product
 * setting every moment stores, so the drawer keeps it editable as chips.
 */
export const ManageMomentDrawer: React.FC<ManageMomentDrawerProps> = ({
  occasion,
  onSave,
  onDelete,
  handleRef,
}) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [nameInput, setNameInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [isAnnual, setIsAnnual] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useImperativeHandle(handleRef, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  // Seed the fields whenever a different occasion arrives; prevOccasion is
  // nulled on dismiss so re-opening the same row re-seeds over stale edits.
  const [prevOccasion, setPrevOccasion] = useState<Occasion | null>(null);
  if (occasion !== prevOccasion) {
    setPrevOccasion(occasion);
    if (occasion) {
      setNameInput(formatOccasionType(occasion.occasion_type));
      setDateInput(seedDateInput(occasion));
      setIsAnnual(occasion.is_annual ?? true);
      setErrorMessage("");
    }
  }

  const handleModeChange = (nextAnnual: boolean) => {
    if (nextAnnual === isAnnual) return;
    setErrorMessage("");

    // Convert the current input so the user doesn't lose their entry.
    const trimmed = dateInput.trim();
    if (nextAnnual && MDY_RE.test(trimmed)) {
      setDateInput(trimmed.slice(0, 5)); // MM-DD-YYYY -> MM-DD
    } else if (!nextAnnual && MONTH_DAY_RE.test(trimmed)) {
      // MM-DD -> next occurrence as a full editable date
      setDateInput(isoToMDY(getNextOccurrence(`--${trimmed}`)));
    } else if (nextAnnual && !MONTH_DAY_RE.test(trimmed)) {
      setDateInput("");
    }

    setIsAnnual(nextAnnual);
  };

  const handleDateChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    let formatted: string;

    if (isAnnual) {
      // MM-DD
      const d = digits.slice(0, 4);
      formatted = d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d;
    } else {
      // MM-DD-YYYY
      const d = digits.slice(0, 8);
      if (d.length > 4) {
        formatted = `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
      } else if (d.length > 2) {
        formatted = `${d.slice(0, 2)}-${d.slice(2)}`;
      } else {
        formatted = d;
      }
    }

    setDateInput(formatted);
    setErrorMessage("");
  };

  const handleSave = () => {
    const trimmed = dateInput.trim();
    const name = nameInput.trim();

    if (!name) {
      setErrorMessage("Please give the moment a name");
      return;
    }

    if (!trimmed) {
      onSave("", name, isAnnual);
      sheetRef.current?.dismiss();
      return;
    }

    if (isAnnual) {
      if (MONTH_DAY_RE.test(trimmed)) {
        const [month, day] = trimmed.split("-").map(Number);
        if (isValidMonthDay(month, day)) {
          // Year is optional for annual occasions — resolve the next occurrence.
          onSave(getNextOccurrence(`--${trimmed}`), name, isAnnual);
          sheetRef.current?.dismiss();
          return;
        }
      }
      setErrorMessage("Please enter the month and day in MM-DD format");
      return;
    }

    if (MDY_RE.test(trimmed)) {
      const [month, day, year] = trimmed.split("-").map(Number);
      if (year >= 1900 && isValidMonthDay(month, day)) {
        onSave(mdyToISO(trimmed), name, isAnnual);
        sheetRef.current?.dismiss();
        return;
      }
    }
    setErrorMessage("Please enter a full date in MM-DD-YYYY format");
  };

  const handleDelete = () => {
    if (!occasion) return;
    sheetRef.current?.dismiss();
    onDelete(occasion);
  };

  const title = occasion
    ? occasion.date
      ? `${formatOccasionType(occasion.occasion_type)} — ${formatOccasionDate(occasion.date)}`
      : formatOccasionType(occasion.occasion_type)
    : "";

  const recurrenceChip = (label: string, annual: boolean) => {
    const selected = isAnnual === annual;
    return (
      <Pressable
        onPress={() => handleModeChange(annual)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[
          styles.chip,
          selected ? styles.chipFilled : styles.chipOutlined,
        ]}
      >
        <Text
          style={selected ? styles.chipLabelFilled : styles.chipLabelOutlined}
        >
          {label}
        </Text>
      </Pressable>
    );
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
        setPrevOccasion(null);
        setErrorMessage("");
      }}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sectionLabel}>EDIT DETAILS</Text>
        <Text style={styles.fieldLabel}>Occasion Name</Text>
        <BottomSheetTextInput
          value={nameInput}
          onChangeText={(text) => {
            setNameInput(text);
            setErrorMessage("");
          }}
          placeholder="e.g. Anniversary"
          placeholderTextColor={Colors.brand.mediumTeal}
          autoCapitalize="words"
          style={styles.input}
        />
        <View style={styles.fieldGap} />
        <Text style={styles.fieldLabel}>Repeats</Text>
        <View style={styles.chipRow}>
          {recurrenceChip("Repeats yearly", true)}
          {recurrenceChip("One-time", false)}
        </View>
        <View style={styles.fieldGap} />
        <Text style={styles.fieldLabel}>Date</Text>
        <BottomSheetTextInput
          value={dateInput}
          onChangeText={handleDateChange}
          placeholder={isAnnual ? "MM-DD" : "MM-DD-YYYY"}
          placeholderTextColor={Colors.brand.mediumTeal}
          keyboardType="number-pad"
          maxLength={isAnnual ? 5 : 10}
          style={styles.input}
        />
        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        <Button
          mode="contained"
          buttonColor={Colors.brand.darkTeal}
          textColor={Colors.white}
          onPress={handleSave}
          style={styles.cta}
          contentStyle={styles.ctaContent}
          labelStyle={styles.ctaLabel}
        >
          Save Changes
        </Button>
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete moment"
          style={styles.deleteLink}
        >
          <Text style={styles.deleteLinkText}>Delete Moment</Text>
        </Pressable>
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
  sectionLabel: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.mediumTeal,
    marginTop: 24,
    marginBottom: 12,
  },
  fieldLabel: {
    ...Typography.fieldLabel,
    color: Colors.brand.mediumTeal,
    marginBottom: 4,
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
  errorText: {
    ...Typography.fieldLabel,
    color: Colors.brand.rose,
    marginTop: 8,
  },
  cta: {
    alignSelf: "center",
    width: 170,
    borderRadius: 24,
    marginTop: 22,
  },
  ctaContent: {
    height: 46,
  },
  ctaLabel: {
    ...Typography.largeCta,
  },
  deleteLink: {
    alignSelf: "center",
    marginTop: 22,
    minHeight: 24,
    justifyContent: "center",
  },
  deleteLinkText: {
    ...Typography.largeCta,
    color: Colors.brand.rose,
  },
});
