import { useImperativeHandle, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";

export type YearCalendarDrawerHandle = {
  present: (year: number) => void;
  dismiss: () => void;
};

type YearCalendarDrawerProps = {
  onSelectMonth: (monthDate: Date) => void;
  handleRef: React.MutableRefObject<YearCalendarDrawerHandle | null>;
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Year Calendar drawer (Figma 4995:5886): ‹ year › stepper over a 3×4 month
 * grid. Replaces the inline expanding year grid on the Moments screen.
 */
export const YearCalendarDrawer: React.FC<YearCalendarDrawerProps> = ({
  onSelectMonth,
  handleRef,
}) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  useImperativeHandle(handleRef, () => ({
    present: (initialYear: number) => {
      setYear(initialYear);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      handleIndicatorStyle={styles.sheetHandle}
      backgroundStyle={styles.sheetBackground}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.yearNav}>
          <Pressable
            onPress={() => setYear((y) => y - 1)}
            accessibilityRole="button"
            accessibilityLabel="Previous year"
            hitSlop={8}
          >
            <MaterialIcons
              name="chevron-left"
              size={22}
              color={Colors.brand.darkTeal}
            />
          </Pressable>
          <Text style={styles.yearLabel}>{year}</Text>
          <Pressable
            onPress={() => setYear((y) => y + 1)}
            accessibilityRole="button"
            accessibilityLabel="Next year"
            hitSlop={8}
          >
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={Colors.brand.darkTeal}
            />
          </Pressable>
        </View>
        <View style={styles.monthGrid}>
          {MONTH_LABELS.map((label, month) => (
            <Pressable
              key={label}
              style={styles.monthCell}
              onPress={() => {
                sheetRef.current?.dismiss();
                onSelectMonth(new Date(year, month, 1));
              }}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${year}`}
            >
              <Text style={styles.monthLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
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
    paddingTop: 16,
    paddingBottom: 32,
  },
  yearNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
  },
  yearLabel: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
    textAlign: "center",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 24,
    rowGap: 16,
  },
  monthCell: {
    width: "33.33%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
  },
});
