import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Chip,
  Dialog,
  Divider,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
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
import { useToast } from "../../hooks/use-toast";
import GradientBackground from "../../components/GradientBackground";
import MomentsCalendar from "../../components/moments/MomentsCalendar";
import MomentsYearGrid from "../../components/moments/MomentsYearGrid";
import MomentsPersonCard from "../../components/moments/MomentsPersonCard";
import { formatShortName } from "../../lib/format-name";
import {
  formatOccasionType,
  stripRecipientName,
} from "../../utils/home-occasions";
import {
  addMonths,
  dayKey,
  isLeapYear,
  isSameDay,
  occasionDayKey,
} from "../../utils/moments-calendar";
import { formatOccasionDate } from "../../utils/occasion-dates";

interface Occasion {
  id: string;
  date: string;
  occasion_type: string;
  recipient_id: string;
  recipient?: {
    name: string;
    relationship_type: string;
    photo_url?: string | null;
  };
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Quick-pick occasion types for the inline day-add entry. Stored lowercased to
// match the occasion_type convention; formatOccasionType title-cases on display.
const COMMON_OCCASION_TYPES = [
  "birthday",
  "anniversary",
  "graduation",
  "wedding",
  "holiday",
];

export default function Calendar() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: occasions = [] } = useAllOccasions();
  const { data: recipients = [] } = useRecipients();
  const deleteOccasion = useDeleteOccasion();
  const createOccasion = useCreateOccasion();
  const { toast, showToast } = useToast();

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showYear, setShowYear] = useState(false);
  const [occasionToDelete, setOccasionToDelete] = useState<Occasion | null>(
    null
  );
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  // When a recipient is picked for a selected calendar day, we capture the
  // occasion inline (seeded with that day) instead of routing to their profile,
  // so the chosen date is never lost.
  const [occasionEntryRecipient, setOccasionEntryRecipient] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [occasionEntryDate, setOccasionEntryDate] = useState<Date | null>(null);
  const [occasionTypeInput, setOccasionTypeInput] = useState("");
  const [occasionIsAnnual, setOccasionIsAnnual] = useState(true);

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
    const canonical = occasionDayKey(occasion.date);
    let key = canonical;
    if (occasion.is_annual) {
      const monthDay = canonical.slice(5); // "MM-DD"
      // A common year has no Feb 29 cell, so clamp leap-day occasions to Feb 28
      // rather than dropping their marker for three years out of four.
      const clamped =
        monthDay === "02-29" && !isLeapYear(viewYear) ? "02-28" : monthDay;
      key = `${viewYear}-${clamped}`;
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
    ? occasionsByDay.get(dayKey(selectedDate)) ?? []
    : [];

  // Someone already on the picked day can't be added to it again, so hide them
  // from the picker. Month-view "Add Moments" has no chosen date and keeps the
  // full list.
  const attachedRecipientIds = new Set(
    selectedOccasions.map((occasion) => occasion.recipient_id)
  );
  const pickerRecipients = selectedDate
    ? recipients.filter((recipient) => !attachedRecipientIds.has(recipient.id))
    : recipients;

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
    setShowYear(false);
  }

  function handleAddOccasionForRecipient(recipient: {
    id: string;
    name: string;
  }) {
    setShowRecipientPicker(false);
    // With a day chosen, capture the occasion inline on that date. Routing to
    // the profile's add-occasion chat here would discard the picked date and
    // force the user to re-enter it. Without a chosen date (month-view
    // "Add Moments"), fall back to that chat — it derives the date itself.
    if (selectedDate) {
      setOccasionEntryRecipient(recipient);
      setOccasionEntryDate(selectedDate);
      setOccasionTypeInput("");
      setOccasionIsAnnual(true);
      return;
    }
    router.push(`/contacts/${recipient.id}?addOccasion=true`);
  }

  function handleDismissOccasionEntry() {
    setOccasionEntryRecipient(null);
    setOccasionEntryDate(null);
  }

  function handleSaveInlineOccasion() {
    if (!occasionEntryRecipient || !occasionEntryDate) return;
    const occasionType = occasionTypeInput.trim().toLowerCase();
    if (!occasionType) return;
    createOccasion.mutate(
      {
        recipientId: occasionEntryRecipient.id,
        date: dayKey(occasionEntryDate),
        occasionType,
        isAnnual: occasionIsAnnual,
      },
      {
        // Failures surface via the shared mutation handler's snackbar.
        onSuccess: () => {
          showToast("Occasion added");
          handleDismissOccasionEntry();
        },
      }
    );
  }

  // The day-add picker only listed existing recipients, dead-ending anyone whose
  // person isn't in BeGifted yet. Route into the existing add-recipient flow,
  // which captures the person and their occasions in one pass.
  function handleAddNewPerson() {
    setShowRecipientPicker(false);
    router.push("/contacts/add");
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
        onSuccess: () => showToast("Occasion deleted"),
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
          {showYear && !selectedDate ? (
            <>
              <View style={styles.yearHeader}>
                <Text style={styles.title}>These are{"\n"}your moments.</Text>
              </View>
              <MomentsYearGrid
                year={viewMonth.getFullYear()}
                markersByDay={markersByDay}
                onSelectMonth={handleSelectMonthFromYear}
                onCollapse={() => setShowYear(false)}
              />
            </>
          ) : (
            <>
              {selectedDate ? (
                <View style={styles.dayHeader}>
                  {/* The Figma frames have no back affordance for the day view, so
                  the eyebrow doubles as one: tapping it returns to the month
                  ("These are your moments.") overview. */}
                  <Pressable
                    style={styles.backRow}
                    onPress={() => setSelectedDate(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Back to all moments"
                  >
                    <MaterialIcons
                      name="chevron-left"
                      size={18}
                      color={Colors.brand.mediumTeal}
                    />
                    <Text style={styles.eyebrow}>MOMENTS</Text>
                  </Pressable>
                  <View style={styles.dayTitleRow}>
                    <Text style={styles.title}>{dayTitle}</Text>
                    <Pressable
                      style={styles.addDayButton}
                      onPress={() => setShowRecipientPicker(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Add to this day"
                    >
                      <MaterialIcons
                        name="add"
                        size={16}
                        color={Colors.brand.darkTeal}
                      />
                      <Text style={styles.addDayLabel}>Add to this day</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.monthHeader}>
                  <Text style={styles.title}>These are{"\n"}your moments.</Text>
                  <Text style={styles.subhead}>
                    Add the moments that matter.{"\n"}We’ll keep track of
                    them...
                  </Text>
                </View>
              )}

              {selectedDate ? (
                <View style={styles.peopleList}>
                  {selectedOccasions.length === 0 ? (
                    <Text style={styles.noPeople}>
                      No moments on this day yet.
                    </Text>
                  ) : (
                    selectedOccasions.map((occasion) => (
                      <MomentsPersonCard
                        key={occasion.id}
                        name={occasion.recipient?.name || "Unknown"}
                        photoUrl={occasion.recipient?.photo_url}
                        onPress={() => handleOccasionPress(occasion)}
                        onLongPress={() => setOccasionToDelete(occasion)}
                        onOverflow={
                          selectedOccasions.length > 1
                            ? () => setOccasionToDelete(occasion)
                            : undefined
                        }
                      />
                    ))
                  )}
                </View>
              ) : (
                <Pressable
                  style={styles.addMomentsButton}
                  onPress={() => setShowRecipientPicker(true)}
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
              )}

              {/* In the day view the design anchors the calendar low, with the
              breathing room sitting above it (between the person cards and the
              grid). This spacer reproduces that on devices taller than the
              874pt design frame; the month view fills naturally like its frame. */}
              {selectedDate && <View style={styles.daySpacer} />}

              <MomentsCalendar
                monthDate={viewMonth}
                markersByDay={markersByDay}
                monthLabel={monthLabel}
                today={today}
                selectedDate={selectedDate}
                variant={selectedDate ? "day" : "month"}
                onSelectDay={handleSelectDay}
                onPrevMonth={() => handleStepMonth(-1)}
                onNextMonth={() => handleStepMonth(1)}
                onExpandYear={() => setShowYear(true)}
              />
            </>
          )}
        </View>
      </ScrollView>

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
            <Text variant="headlineSmall">
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
              buttonColor="#cc0000"
              textColor="#fff"
              onPress={handleConfirmDelete}
              loading={deleteOccasion.isPending}
              style={styles.dialogButton}
            >
              Delete
            </Button>
          </View>
        </Dialog>
        <Dialog
          visible={showRecipientPicker}
          onDismiss={() => setShowRecipientPicker(false)}
          style={styles.dialog}
        >
          <Dialog.Title>
            <Text variant="bodySmall" style={styles.dialogLabel}>
              Add Occasion
            </Text>
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="headlineSmall" style={styles.pickerHeadline}>
              Choose a recipient
            </Text>
            {pickerRecipients.length === 0 ? (
              <Text variant="bodyMedium" style={styles.pickerEmpty}>
                {recipients.length === 0
                  ? "No one in BeGifted yet — add your first person below."
                  : "Everyone you know is already on this day — add someone new below."}
              </Text>
            ) : (
              <FlatList
                data={pickerRecipients}
                keyExtractor={(item) => item.id}
                style={styles.recipientList}
                renderItem={({ item }) => (
                  <Button
                    mode="text"
                    onPress={() =>
                      handleAddOccasionForRecipient({
                        id: item.id,
                        name: item.name,
                      })
                    }
                    contentStyle={styles.recipientItemContent}
                    icon="account"
                  >
                    {item.name}
                  </Button>
                )}
              />
            )}
            {/* Separate the create-new action from the recipient rows above so it
            doesn't read as just another person in the list. */}
            <Divider style={styles.pickerDivider} />
            <Button
              mode="text"
              onPress={handleAddNewPerson}
              contentStyle={styles.recipientItemContent}
              icon="account-plus"
            >
              Add a new person
            </Button>
          </Dialog.Content>
          <View style={styles.dialogActions}>
            <Button
              mode="outlined"
              onPress={() => setShowRecipientPicker(false)}
              style={styles.dialogButton}
            >
              Cancel
            </Button>
          </View>
        </Dialog>
        <Dialog
          visible={!!occasionEntryRecipient}
          onDismiss={handleDismissOccasionEntry}
          style={styles.dialog}
        >
          <Dialog.Title>
            <Text variant="bodySmall" style={styles.dialogLabel}>
              Add Occasion
            </Text>
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="headlineSmall" style={styles.pickerHeadline}>
              {occasionEntryRecipient?.name}
              {occasionEntryDate
                ? ` · ${formatOccasionDate(occasionEntryDate)}`
                : ""}
            </Text>
            <View style={styles.occasionChips}>
              {COMMON_OCCASION_TYPES.map((type) => (
                <Chip
                  key={type}
                  mode="outlined"
                  selected={occasionTypeInput.trim().toLowerCase() === type}
                  onPress={() => setOccasionTypeInput(formatOccasionType(type))}
                >
                  {formatOccasionType(type)}
                </Chip>
              ))}
            </View>
            <TextInput
              mode="outlined"
              label="Occasion"
              placeholder="e.g. Birthday"
              value={occasionTypeInput}
              onChangeText={setOccasionTypeInput}
              autoCapitalize="words"
              style={styles.occasionInput}
            />
            <SegmentedButtons
              value={occasionIsAnnual ? "annual" : "oneTime"}
              onValueChange={(value) => setOccasionIsAnnual(value === "annual")}
              buttons={[
                { value: "annual", label: "Repeats yearly" },
                { value: "oneTime", label: "One-time" },
              ]}
              style={styles.occasionRecurrence}
            />
          </Dialog.Content>
          <View style={styles.dialogActions}>
            <Button
              mode="outlined"
              onPress={handleDismissOccasionEntry}
              style={styles.dialogButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveInlineOccasion}
              loading={createOccasion.isPending}
              disabled={!occasionTypeInput.trim() || createOccasion.isPending}
              style={styles.dialogButton}
            >
              Save
            </Button>
          </View>
        </Dialog>
      </Portal>
      {toast}
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
  yearHeader: {
    marginBottom: 28,
  },
  dayHeader: {
    marginBottom: 20,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: -4,
    marginBottom: 4,
  },
  eyebrow: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.mediumTeal,
  },
  dayTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
  addDayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.brand.gold,
    paddingHorizontal: 14,
    gap: 6,
  },
  addDayLabel: {
    ...Typography.largeCta,
    color: Colors.brand.darkTeal,
  },
  peopleList: {
    gap: 10,
    marginBottom: 24,
  },
  daySpacer: {
    flex: 1,
    minHeight: 24,
  },
  noPeople: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
    opacity: 0.7,
    paddingVertical: 12,
  },
  loadingText: {
    color: Colors.darks.black,
    opacity: 0.8,
  },
  dialog: {
    borderRadius: 16,
  },
  dialogLabel: {
    color: "#595959",
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
  pickerHeadline: {
    marginBottom: 12,
  },
  occasionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  occasionInput: {
    marginBottom: 16,
  },
  occasionRecurrence: {
    marginBottom: 4,
  },
  pickerEmpty: {
    color: "#888",
    textAlign: "center",
    paddingVertical: 16,
  },
  recipientList: {
    maxHeight: 300,
  },
  pickerDivider: {
    marginTop: 4,
    marginBottom: 4,
  },
  recipientItemContent: {
    justifyContent: "flex-start",
  },
});
