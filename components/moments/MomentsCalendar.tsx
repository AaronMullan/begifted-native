import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { Radii, Typography } from "../../lib/typography";
import ExpandCircleIcon from "../ExpandCircleIcon";
import type { CalendarCell } from "../../utils/moments-calendar";
import {
  buildMonthWeeks,
  dayKey,
  isSameDay,
  WEEKDAY_LABELS,
} from "../../utils/moments-calendar";

type MomentsCalendarProps = {
  /** Any date within the month to render. */
  monthDate: Date;
  /** Local YYYY-MM-DD → marker colors (one per occasion that day). */
  markersByDay: Map<string, string[]>;
  monthLabel: string;
  today: Date;
  selectedDate: Date | null;
  /** "month" = white card (default view); "day" = beige card (a day is open). */
  variant: "month" | "day";
  onSelectDay: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** The gold chevron expands the month into the 12-month year view. */
  onExpandYear: () => void;
};

/**
 * Month calendar from the Figma "Moments" redesign: Monday-first grid, today as
 * a gold disc, and small per-recipient markers under any day that has an
 * occasion (a single bar for one occasion, a row of dots for several). The
 * gold chevron expands into the 12-month year view; the side arrows step
 * months.
 */
export default function MomentsCalendar({
  monthDate,
  markersByDay,
  monthLabel,
  today,
  selectedDate,
  variant,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onExpandYear,
}: MomentsCalendarProps) {
  const weeks = buildMonthWeeks(monthDate);

  return (
    <View
      style={[
        styles.card,
        variant === "month" ? styles.cardMonth : styles.cardDay,
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.monthLabelGroup}
          onPress={onExpandYear}
          accessibilityRole="button"
          accessibilityLabel="Show year view"
        >
          <ExpandCircleIcon
            direction="down"
            color={Colors.brand.gold}
            size={24}
          />
          <Text style={styles.monthLabel}>{monthLabel}</Text>
        </Pressable>
        <View style={styles.monthNav}>
          <Pressable
            onPress={onPrevMonth}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <MaterialIcons
              name="chevron-left"
              size={26}
              color={Colors.brand.darkTeal}
            />
          </Pressable>
          <Pressable
            onPress={onNextMonth}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <MaterialIcons
              name="chevron-right"
              size={26}
              color={Colors.brand.darkTeal}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={dayKey(week[0].date)} style={styles.week}>
          {week.map((cell) => (
            <DayCell
              key={dayKey(cell.date)}
              cell={cell}
              markers={
                cell.inMonth ? markersByDay.get(dayKey(cell.date)) : undefined
              }
              isToday={isSameDay(cell.date, today)}
              isSelected={!!selectedDate && isSameDay(cell.date, selectedDate)}
              onSelectDay={onSelectDay}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

type DayCellProps = {
  cell: CalendarCell;
  markers: string[] | undefined;
  isToday: boolean;
  isSelected: boolean;
  onSelectDay: (date: Date) => void;
};

function DayCell({
  cell,
  markers,
  isToday,
  isSelected,
  onSelectDay,
}: DayCellProps) {
  const number = (
    <View
      style={[
        styles.dayDisc,
        isToday && styles.dayDiscToday,
        isSelected && !isToday && styles.dayDiscSelected,
      ]}
    >
      <Text
        style={[
          styles.dayNumber,
          !cell.inMonth && styles.dayNumberMuted,
          isToday && styles.dayNumberToday,
        ]}
      >
        {cell.date.getDate()}
      </Text>
    </View>
  );

  return (
    <View style={styles.cell}>
      {cell.inMonth ? (
        <Pressable
          onPress={() => onSelectDay(cell.date)}
          accessibilityRole="button"
          accessibilityLabel={`${cell.date.toDateString()}${
            markers ? `, ${markers.length} occasion(s)` : ""
          }`}
        >
          {number}
        </Pressable>
      ) : (
        number
      )}
      <View style={styles.markerRow}>
        {markers?.length === 1 ? (
          <View style={[styles.markerBar, { backgroundColor: markers[0] }]} />
        ) : (
          markers
            ?.slice(0, 4)
            .map((color, i) => (
              <View
                key={i}
                style={[styles.markerDot, { backgroundColor: color }]}
              />
            ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cardMonth: {
    backgroundColor: Colors.white,
  },
  cardDay: {
    backgroundColor: Colors.brand.beige,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  monthLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  monthLabel: {
    ...Typography.subhead,
    color: Colors.darks.black,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekday: {
    ...Typography.subhead,
    flex: 1,
    textAlign: "center",
    color: Colors.darks.black,
  },
  week: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    height: 50,
    alignItems: "center",
  },
  dayDisc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDiscToday: {
    backgroundColor: Colors.brand.gold,
  },
  dayDiscSelected: {
    borderWidth: 1.5,
    borderColor: Colors.brand.gold,
  },
  dayNumber: {
    ...Typography.subhead,
    color: Colors.darks.black,
  },
  dayNumberMuted: {
    color: Colors.brand.beige,
  },
  dayNumberToday: {
    color: Colors.white,
  },
  markerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 6,
    marginTop: 3,
  },
  markerBar: {
    width: 16,
    height: 4,
    borderRadius: 2,
  },
  markerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
