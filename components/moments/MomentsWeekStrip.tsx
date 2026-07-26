import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { isSameDay } from "../../utils/moments-calendar";

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type MomentsWeekStripProps = {
  /** The day the strip centers on; its Monday-started week is shown. */
  selectedDate: Date;
  onSelectDay: (date: Date) => void;
};

/**
 * Single-week strip for the Moments day view (Figma week-strip in
 * 4994:2876): Mo–Su labels over the dates of the selected week, the picked
 * day in a filled darkTeal circle, a hairline underneath.
 */
export default function MomentsWeekStrip({
  selectedDate,
  onSelectDay,
}: MomentsWeekStripProps) {
  // Monday-start week containing the selected date.
  const monday = new Date(selectedDate);
  const offset = (selectedDate.getDay() + 6) % 7;
  monday.setDate(selectedDate.getDate() - offset);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });

  return (
    <View>
      <View style={styles.row}>
        {days.map((date, i) => {
          const selected = isSameDay(date, selectedDate);
          return (
            <Pressable
              key={i}
              style={styles.cell}
              onPress={() => onSelectDay(date)}
              accessibilityRole="button"
              accessibilityLabel={date.toDateString()}
            >
              <Text style={styles.dayLabel}>{DAY_LABELS[i]}</Text>
              <View style={[styles.dayCircle, selected && styles.daySelected]}>
                <Text
                  style={[
                    styles.dayNumber,
                    selected && styles.dayNumberSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.hairline} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },
  // smallCta, not sectionHeadAc: the frame's labels are title-case ("Mo"),
  // and sectionHeadAc force-uppercases.
  dayLabel: {
    ...Typography.smallCta,
    color: Colors.brand.darkTeal,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  daySelected: {
    backgroundColor: Colors.brand.darkTeal,
  },
  // Unselected days de-emphasize to beige (sampled from the frame), not a
  // teal — only the picked day carries color.
  dayNumber: {
    ...Typography.subhead,
    color: Colors.brand.beige,
  },
  dayNumberSelected: {
    color: Colors.white,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.brand.lightTeal,
    marginHorizontal: 20,
    marginTop: 16,
  },
});
