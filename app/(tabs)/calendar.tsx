import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { Radii, Typography } from "../../lib/typography";
import { BOTTOM_NAV_HEIGHT } from "../../lib/constants";
import { recipientMarkerColor } from "../../lib/recipient-color";
import { useAuth } from "../../hooks/use-auth";
import { useAllOccasions } from "../../hooks/use-occasions";
import { useRecipients } from "../../hooks/use-recipients";
import {
  useCreateOccasion,
  useDeleteOccasion,
} from "../../hooks/use-occasion-mutations";
import { showSnackbar } from "../../components/GlobalSnackbar";
import GradientBackground from "../../components/GradientBackground";
import ExpandCircleIcon from "../../components/ExpandCircleIcon";
import MomentsCalendar from "../../components/moments/MomentsCalendar";
import MomentsPersonCard from "../../components/moments/MomentsPersonCard";
import MomentsWeekStrip from "../../components/moments/MomentsWeekStrip";
import {
  SelectPersonDrawer,
  type SelectPersonDrawerHandle,
  type SelectPersonRow,
} from "../../components/moments/SelectPersonDrawer";
import {
  AddMomentDrawer,
  type AddMomentDrawerHandle,
} from "../../components/moments/AddMomentDrawer";
import {
  AddNewPersonDrawer,
  type AddNewPersonDrawerHandle,
} from "../../components/moments/AddNewPersonDrawer";
import {
  YearCalendarDrawer,
  type YearCalendarDrawerHandle,
} from "../../components/moments/YearCalendarDrawer";
import { formatShortName } from "../../lib/format-name";
import {
  formatOccasionType,
  stripRecipientName,
} from "../../utils/home-occasions";
import { getNextUpcomingOccasion } from "../../utils/upcoming-occasion";
import { recommendedMomentsFor } from "../../utils/recommended-moments";
import { useInterestMomentSuggestions } from "../../hooks/use-interest-moment-suggestions";
import {
  addMonths,
  dayKey,
  isLeapYear,
  isSameDay,
  occasionDayKey,
} from "../../utils/moments-calendar";
import {
  formatOccasionDate,
  lookupOccasionDate,
} from "../../utils/occasion-dates";

interface Occasion {
  id: string;
  date: string | null;
  occasion_type: string;
  recipient_id: string;
  is_annual?: boolean;
  recipient?: {
    name: string;
    relationship_type: string;
    photo_url?: string | null;
  };
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function Calendar() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: occasions = [] } = useAllOccasions();
  const { data: recipients = [] } = useRecipients();
  const deleteOccasion = useDeleteOccasion();
  const createOccasion = useCreateOccasion();

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [occasionToDelete, setOccasionToDelete] = useState<Occasion | null>(
    null
  );
  // The person picked in the Select Person drawer, awaiting a moment name in
  // the Add Moment drawer (day-view flow only — a chosen date is required).
  const [momentPerson, setMomentPerson] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const selectPersonRef = useRef<SelectPersonDrawerHandle | null>(null);
  const addMomentRef = useRef<AddMomentDrawerHandle | null>(null);
  const addNewPersonRef = useRef<AddNewPersonDrawerHandle | null>(null);
  const yearDrawerRef = useRef<YearCalendarDrawerHandle | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Group occasions onto the calendar day they mark, then resolve each to its
  // recipient's stable marker color for the grid. Recurring occasions
  // (birthdays, anniversaries) are projected onto the viewed year so a
  // past-dated annual keeps marking its day every year, not just the year it was
  // saved; one-time occasions mark their exact stored day, past or future. Both
  // grids only paint in-month cells, so projecting to the viewed year alone
  // covers everything on screen.
  const viewYear = viewMonth.getFullYear();
  const occasionsByDay = new Map<string, Occasion[]>();
  for (const occasion of occasions) {
    // Undated occasions have no day to mark.
    if (!occasion.date) continue;
    const canonical = occasionDayKey(occasion.date);
    let key = canonical;
    if (occasion.is_annual) {
      // Floating holidays (Mother's Day, Easter…) land on a different date
      // each year — resolve known types to the viewed year's actual date
      // instead of projecting the stored month/day.
      const holidayDate = lookupOccasionDate(occasion.occasion_type, viewYear);
      if (holidayDate?.startsWith(`${viewYear}-`)) {
        key = holidayDate;
      } else {
        const monthDay = canonical.slice(5); // "MM-DD"
        // A common year has no Feb 29 cell, so clamp leap-day occasions to Feb 28
        // rather than dropping their marker for three years out of four.
        const clamped =
          monthDay === "02-29" && !isLeapYear(viewYear) ? "02-28" : monthDay;
        key = `${viewYear}-${clamped}`;
      }
    }
    const list = occasionsByDay.get(key);
    if (list) list.push(occasion);
    else occasionsByDay.set(key, [occasion]);
  }
  const markersByDay = new Map<string, string[]>();
  for (const [key, list] of occasionsByDay) {
    markersByDay.set(
      key,
      list.map((occasion) => recipientMarkerColor(occasion.recipient_id))
    );
  }

  const selectedOccasions = selectedDate
    ? (occasionsByDay.get(dayKey(selectedDate)) ?? [])
    : [];

  // Someone already on the picked day can't be added to it again, so hide them
  // from the picker. Month-view "Add Moments" has no chosen date and keeps the
  // full list.
  const attachedRecipientIds = new Set(
    selectedOccasions.map((occasion) => occasion.recipient_id)
  );
  const occasionsByRecipient = new Map<string, Occasion[]>();
  for (const occasion of occasions) {
    const list = occasionsByRecipient.get(occasion.recipient_id);
    if (list) list.push(occasion);
    else occasionsByRecipient.set(occasion.recipient_id, [occasion]);
  }
  // Fetch kicks off when a person is picked, so chips are usually ready by
  // the time the Add Moment drawer settles; they fill in live otherwise.
  const momentRecipient = momentPerson
    ? recipients.find((r) => r.id === momentPerson.id)
    : null;
  const interestSuggestions = useInterestMomentSuggestions(
    momentRecipient,
    momentPerson ? (occasionsByRecipient.get(momentPerson.id) ?? []) : []
  );
  const pickerPeople: SelectPersonRow[] = recipients
    .filter(
      (recipient) => !selectedDate || !attachedRecipientIds.has(recipient.id)
    )
    .map((recipient) => {
      const upcoming = getNextUpcomingOccasion(
        recipient.birthday ?? undefined,
        (occasionsByRecipient.get(recipient.id) ?? []) as never
      );
      return {
        id: recipient.id,
        name: recipient.name,
        photoUrl: recipient.photo_url,
        subtitle: upcoming
          ? `${formatOccasionType(upcoming.occasionType)} • ${formatOccasionDate(
              upcoming.date
            )}`
          : null,
      };
    });

  const monthLabel =
    viewMonth.getFullYear() === today.getFullYear()
      ? viewMonth.toLocaleDateString("en-US", { month: "long" })
      : viewMonth.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

  const dayTitle = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : "";

  function formatOccasionTitle(occasion: Occasion): string {
    const recipientName = occasion.recipient?.name || "Unknown";
    const shortName = formatShortName(recipientName);
    const occasionType = formatOccasionType(
      stripRecipientName(occasion.occasion_type, recipientName)
    );
    const possessive = shortName.endsWith("s")
      ? `${shortName}'`
      : `${shortName}'s`;
    return `${possessive} ${occasionType}`;
  }

  function handleSelectDay(date: Date) {
    // Re-tapping the open day collapses back to the month ("These are your
    // moments.") view; there is no separate back affordance in the design.
    if (selectedDate && isSameDay(date, selectedDate)) {
      setSelectedDate(null);
      return;
    }
    setViewMonth(startOfMonth(date));
    setSelectedDate(date);
  }

  function handleStepMonth(delta: number) {
    setViewMonth((current) => addMonths(current, delta));
    setSelectedDate(null);
  }

  function handleSelectMonthFromYear(monthDate: Date) {
    setViewMonth(startOfMonth(monthDate));
    setSelectedDate(null);
  }

  function handleSelectPerson(person: SelectPersonRow) {
    selectPersonRef.current?.dismiss();
    // With a day chosen, capture the moment in the Add Moment drawer on that
    // date. Without one (month-view "Add Moments"), fall back to the profile's
    // add-occasion chat — it derives the date itself.
    if (selectedDate) {
      setMomentPerson({ id: person.id, name: person.name });
      addMomentRef.current?.present();
      return;
    }
    router.push(`/contacts/${person.id}?addOccasion=true`);
  }

  function handleAddNewPerson() {
    selectPersonRef.current?.dismiss();
    addNewPersonRef.current?.present();
  }

  // The free-form note seeds the add-recipient conversation as its first user
  // message, so the same extraction pipeline runs as in the chat flow.
  function handleSendNewPersonNote(note: string) {
    router.push({
      pathname: "/contacts/add",
      params: { initialNote: note },
    });
  }

  async function handleSaveMoment(momentName: string): Promise<boolean> {
    if (!momentPerson || !selectedDate) return false;
    return new Promise((resolve) => {
      createOccasion.mutate(
        {
          recipientId: momentPerson.id,
          date: dayKey(selectedDate),
          occasionType: momentName.toLowerCase(),
          isAnnual: true,
        },
        {
          // Failures surface via the shared mutation handler's snackbar.
          onSuccess: () => {
            showSnackbar("Moment added");
            setMomentPerson(null);
            resolve(true);
          },
          onError: () => resolve(false),
        }
      );
    });
  }

  function handleOccasionPress(occasion: Occasion) {
    router.push(`/contacts/${occasion.recipient_id}?tab=gifts`);
  }

  function handleConfirmDelete() {
    if (!occasionToDelete || !user) return;
    deleteOccasion.mutate(
      {
        occasionId: occasionToDelete.id,
        recipientId: occasionToDelete.recipient_id,
      },
      {
        // Failures surface via the shared mutation handler's snackbar.
        onSuccess: () => showSnackbar("Occasion deleted"),
        onSettled: () => setOccasionToDelete(null),
      }
    );
  }

  if (authLoading) {
    return (
      <View style={styles.container}>
        <GradientBackground />
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <GradientBackground />
        <View style={styles.centered}>
          <Text style={styles.title}>These are{"\n"}your moments.</Text>
          <Text style={styles.subhead}>
            Please sign in to view your moments.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {selectedDate ? (
            <>
              <View style={styles.dayHeader}>
                <Pressable
                  style={styles.backRow}
                  onPress={() => setSelectedDate(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Back to all moments"
                >
                  <Text style={styles.eyebrow}>MOMENTS</Text>
                </Pressable>
                <View style={styles.dayTitleRow}>
                  <Text style={styles.title}>{dayTitle}</Text>
                  <Pressable
                    onPress={() => setSelectedDate(null)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Collapse to month view"
                  >
                    <ExpandCircleIcon
                      direction="down"
                      color={Colors.brand.gold}
                      size={24}
                    />
                  </Pressable>
                </View>
              </View>

              <MomentsWeekStrip
                selectedDate={selectedDate}
                onSelectDay={handleSelectDay}
              />

              {selectedOccasions.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyTitle}>No moments here yet</Text>
                  <Text style={styles.emptyBody}>
                    Add one to remember what mattered on this day.
                  </Text>
                </View>
              ) : (
                <View style={styles.peopleList}>
                  {selectedOccasions.map((occasion) => (
                    <MomentsPersonCard
                      key={occasion.id}
                      name={occasion.recipient?.name || "Unknown"}
                      occasionLabel={formatOccasionType(
                        stripRecipientName(
                          occasion.occasion_type,
                          occasion.recipient?.name || ""
                        )
                      )}
                      photoUrl={occasion.recipient?.photo_url}
                      onPress={() => handleOccasionPress(occasion)}
                      onLongPress={() => setOccasionToDelete(occasion)}
                      onOverflow={() => setOccasionToDelete(occasion)}
                    />
                  ))}
                </View>
              )}

              <Pressable
                style={styles.addToDayPill}
                onPress={() => selectPersonRef.current?.present()}
                accessibilityRole="button"
                accessibilityLabel={
                  selectedOccasions.length > 0
                    ? "Add another person to this day"
                    : "Add to this day"
                }
              >
                <MaterialIcons name="add" size={16} color={Colors.brand.gold} />
                <Text style={styles.addToDayLabel}>
                  {selectedOccasions.length > 0
                    ? "Add another person to this day"
                    : "Add to this day"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.monthHeader}>
                <Text style={styles.title}>These are{"\n"}your moments.</Text>
                <Text style={styles.subhead}>
                  Add the moments that matter.{"\n"}We’ll keep track of them...
                </Text>
              </View>

              <Pressable
                style={styles.addMomentsButton}
                onPress={() => selectPersonRef.current?.present()}
                accessibilityRole="button"
                accessibilityLabel="Add moments"
              >
                <MaterialIcons
                  name="add"
                  size={16}
                  color={Colors.brand.darkTeal}
                />
                <Text style={styles.addMomentsLabel}>Add Moments</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={14}
                  color={Colors.white}
                />
              </Pressable>

              <MomentsCalendar
                monthDate={viewMonth}
                markersByDay={markersByDay}
                monthLabel={monthLabel}
                today={today}
                selectedDate={selectedDate}
                variant="month"
                onSelectDay={handleSelectDay}
                onPrevMonth={() => handleStepMonth(-1)}
                onNextMonth={() => handleStepMonth(1)}
                onExpandYear={() =>
                  yearDrawerRef.current?.present(viewMonth.getFullYear())
                }
              />
            </>
          )}
        </View>
      </ScrollView>

      <SelectPersonDrawer
        people={pickerPeople}
        onSelectPerson={handleSelectPerson}
        onAddNewPerson={handleAddNewPerson}
        handleRef={selectPersonRef}
      />
      <AddMomentDrawer
        onSave={handleSaveMoment}
        saving={createOccasion.isPending}
        handleRef={addMomentRef}
        recommendedLabel={
          momentPerson
            ? `RECOMMENDED FOR ${formatShortName(momentPerson.name).toUpperCase()}`
            : undefined
        }
        recommendedMoments={recommendedMomentsFor(
          momentRecipient?.relationship_type,
          momentPerson
            ? (occasionsByRecipient.get(momentPerson.id) ?? []).map(
                (o) => o.occasion_type
              )
            : [],
          interestSuggestions.names
        )}
      />
      <AddNewPersonDrawer
        onSend={handleSendNewPersonNote}
        handleRef={addNewPersonRef}
      />
      <YearCalendarDrawer
        onSelectMonth={handleSelectMonthFromYear}
        handleRef={yearDrawerRef}
      />

      <Portal>
        <Dialog
          visible={!!occasionToDelete}
          onDismiss={() => setOccasionToDelete(null)}
          style={styles.dialog}
        >
          <Dialog.Title>
            <Text variant="bodySmall" style={styles.dialogLabel}>
              Delete Occasion
            </Text>
          </Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogHeadline}>
              Delete{" "}
              {occasionToDelete ? formatOccasionTitle(occasionToDelete) : ""}?
            </Text>
          </Dialog.Content>
          <View style={styles.dialogActions}>
            <Button
              mode="outlined"
              onPress={() => setOccasionToDelete(null)}
              style={styles.dialogButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor={Colors.brand.destructiveRed}
              textColor={Colors.white}
              onPress={handleConfirmDelete}
              loading={deleteOccasion.isPending}
              style={styles.dialogButton}
            >
              Delete
            </Button>
          </View>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: BOTTOM_NAV_HEIGHT,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  monthHeader: {
    gap: 12,
    marginBottom: 28,
  },
  dayHeader: {
    marginBottom: 24,
  },
  backRow: {
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  eyebrow: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.mediumTeal,
  },
  dayTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    ...Typography.h1,
    color: Colors.brand.darkTeal,
  },
  subhead: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
  },
  addMomentsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    borderRadius: Radii.md,
    backgroundColor: Colors.brand.gold,
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 24,
  },
  addMomentsLabel: {
    ...Typography.largeCta,
    color: Colors.white,
  },
  peopleList: {
    gap: 22,
    marginTop: 24,
  },
  emptyDay: {
    marginTop: 24,
    gap: 8,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.brand.gold,
  },
  emptyBody: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
  },
  addToDayPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "center",
    width: 204,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.brand.gold,
    marginTop: 48,
  },
  addToDayLabel: {
    ...Typography.largeCta,
    color: Colors.brand.darkTeal,
  },
  noPeople: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
    opacity: 0.7,
    paddingVertical: 12,
  },
  loadingText: {
    color: Colors.brand.darkTeal,
    opacity: 0.8,
  },
  dialog: {
    borderRadius: 16,
  },
  dialogLabel: {
    color: Colors.brand.mediumTeal,
  },
  dialogHeadline: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
  },
  dialogButton: {
    minWidth: 100,
  },
});
