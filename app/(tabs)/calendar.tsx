import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/colors";
import { Radii, Typography } from "../../lib/typography";
import { BOTTOM_NAV_HEIGHT } from "../../lib/constants";
import { recipientMarkerColor } from "../../lib/recipient-color";
import { useAuth } from "../../hooks/use-auth";
import { useOccasions } from "../../hooks/use-occasions";
import { useRecipients } from "../../hooks/use-recipients";
import { useDeleteOccasion } from "../../hooks/use-occasion-mutations";
import { useToast } from "../../hooks/use-toast";
import GradientBackground from "../../components/GradientBackground";
import MomentsCalendar from "../../components/moments/MomentsCalendar";
import MomentsYearGrid from "../../components/moments/MomentsYearGrid";
import MomentsPersonCard from "../../components/moments/MomentsPersonCard";
import { formatShortName } from "../../lib/format-name";
import { formatOccasionType } from "../../utils/home-occasions";
import {
  addMonths,
  dayKey,
  isSameDay,
  occasionDayKey,
} from "../../utils/moments-calendar";

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

export default function Calendar() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: occasions = [] } = useOccasions();
  const { data: recipients = [] } = useRecipients();
  const deleteOccasion = useDeleteOccasion();
  const { toast, showToast } = useToast();

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showYear, setShowYear] = useState(false);
  const [occasionToDelete, setOccasionToDelete] = useState<Occasion | null>(
    null
  );
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Group occasions by local calendar day, then resolve each to its recipient's
  // stable marker color for the grid.
  const occasionsByDay = new Map<string, Occasion[]>();
  for (const occasion of occasions) {
    const key = occasionDayKey(occasion.date);
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
    const occasionType = formatOccasionType(occasion.occasion_type);
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

  function handleAddOccasionForRecipient(recipientId: string) {
    setShowRecipientPicker(false);
    router.push(`/contacts/${recipientId}?addOccasion=true`);
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
        onSuccess: () => {
          showToast("Occasion deleted");
          setOccasionToDelete(null);
        },
        onError: () => {
          showToast("Failed to delete occasion");
          setOccasionToDelete(null);
        },
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
            {recipients.length === 0 ? (
              <Text variant="bodyMedium" style={styles.pickerEmpty}>
                No recipients yet. Add a recipient first.
              </Text>
            ) : (
              <FlatList
                data={recipients}
                keyExtractor={(item) => item.id}
                style={styles.recipientList}
                renderItem={({ item }) => (
                  <Button
                    mode="text"
                    onPress={() => handleAddOccasionForRecipient(item.id)}
                    contentStyle={styles.recipientItemContent}
                    icon="account"
                  >
                    {item.name}
                  </Button>
                )}
              />
            )}
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
  pickerEmpty: {
    color: "#888",
    textAlign: "center",
    paddingVertical: 16,
  },
  recipientList: {
    maxHeight: 300,
  },
  recipientItemContent: {
    justifyContent: "flex-start",
  },
});
