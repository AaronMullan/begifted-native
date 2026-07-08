import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Radii, scaleLineHeight, Typography } from "../../lib/typography";
import ExpandCircleIcon from "../ExpandCircleIcon";
import { buildMonthWeeks, dayKey } from "../../utils/moments-calendar";

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

type MomentsYearGridProps = {
  year: number;
  /** Local YYYY-MM-DD → marker colors, same map the month view uses. */
  markersByDay: Map<string, string[]>;
  /** Tapping a mini-month drops into that month's month view. */
  onSelectMonth: (monthDate: Date) => void;
  /** The gold up-chevron collapses back to the month view. */
  onCollapse: () => void;
};

/**
 * Year view from the Figma "Moments" redesign: the expanded state behind the
 * gold chevron on the month selector. Twelve mini-month grids (Monday-first,
 * reusing the month view's week builder) inside a white card, each carrying a
 * small recipient-color dot under any day with an occasion.
 */
export default function MomentsYearGrid({
  year,
  markersByDay,
  onSelectMonth,
  onCollapse,
}: MomentsYearGridProps) {
  return (
    <View style={styles.card}>
      <Pressable
        style={styles.header}
        onPress={onCollapse}
        accessibilityRole="button"
        accessibilityLabel="Collapse to month view"
      >
        <Text style={styles.yearLabel}>{year}</Text>
        <ExpandCircleIcon direction="up" color={Colors.brand.gold} size={24} />
      </Pressable>

      <View style={styles.grid}>
        {MONTH_LABELS.map((label, month) => (
          <MiniMonth
            key={label}
            label={label}
            monthDate={new Date(year, month, 1)}
            markersByDay={markersByDay}
            onPress={() => onSelectMonth(new Date(year, month, 1))}
          />
        ))}
      </View>
    </View>
  );
}

type MiniMonthProps = {
  label: string;
  monthDate: Date;
  markersByDay: Map<string, string[]>;
  onPress: () => void;
};

function MiniMonth({
  label,
  monthDate,
  markersByDay,
  onPress,
}: MiniMonthProps) {
  const weeks = buildMonthWeeks(monthDate);

  return (
    <Pressable
      style={styles.month}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${monthDate.getFullYear()}`}
    >
      <Text style={styles.monthLabel}>{label}</Text>
      <View>
        {weeks.map((week) => (
          <View key={dayKey(week[0].date)} style={styles.week}>
            {week.map((cell) => {
              const marker = cell.inMonth
                ? markersByDay.get(dayKey(cell.date))
                : undefined;
              return (
                <View key={dayKey(cell.date)} style={styles.dayCell}>
                  <Text
                    style={[
                      styles.dayNumber,
                      !cell.inMonth && styles.dayNumberMuted,
                    ]}
                  >
                    {cell.date.getDate()}
                  </Text>
                  <View style={styles.markerSlot}>
                    {marker?.length ? (
                      <View
                        style={[styles.dot, { backgroundColor: marker[0] }]}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    marginBottom: 18,
  },
  yearLabel: {
    ...Typography.subhead,
    color: Colors.darks.black,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
  },
  month: {
    width: "30%",
  },
  monthLabel: {
    fontFamily: "DMSans_500Medium",
    // eslint-disable-next-line no-restricted-syntax -- DM Sans size the type scale doesn't define
    fontSize: 15,
    color: Colors.darks.black,
    marginBottom: 6,
  },
  week: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
  },
  dayNumber: {
    fontFamily: "DMSans_500Medium",
    // eslint-disable-next-line no-restricted-syntax -- DM Sans size the type scale doesn't define
    fontSize: 10,
    lineHeight: scaleLineHeight(12),
    textAlign: "center",
    color: Colors.darks.black,
  },
  dayNumberMuted: {
    color: Colors.brand.beige,
  },
  markerSlot: {
    height: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
