import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { useAuth } from "../../hooks/use-auth";
import { useOccasions } from "../../hooks/use-occasions";
import { useRecipients } from "../../hooks/use-recipients";
import { useDeleteOccasion } from "../../hooks/use-occasion-mutations";
import { useToast } from "../../hooks/use-toast";
import { useBottomNavScrollVisibility } from "../../hooks/use-bottom-nav-scroll-visibility";
import MenuCard from "../../components/MenuCard";
import { formatShortName } from "../../lib/format-name";

interface Occasion {
  id: string;
  date: string;
  occasion_type: string;
  recipient_id: string;
  recipient?: {
    name: string;
    relationship_type: string;
  };
}

interface GroupedOccasions {
  [key: string]: Occasion[];
}

export default function Calendar() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: occasions = [], isLoading: loading } = useOccasions();
  const { data: recipients = [] } = useRecipients();
  const deleteOccasion = useDeleteOccasion();
  const { toast, showToast } = useToast();
  const { handleScroll } = useBottomNavScrollVisibility();
  const [occasionToDelete, setOccasionToDelete] = useState<Occasion | null>(null);
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  function groupOccasionsByMonth(occasions: Occasion[]): GroupedOccasions {
    const grouped: GroupedOccasions = {};

    occasions.forEach((occasion) => {
      const date = new Date(occasion.date);
      const monthKey = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(occasion);
    });

    return grouped;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function calculateDaysUntil(dateString: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const occasionDate = new Date(dateString);
    occasionDate.setHours(0, 0, 0, 0);
    const diffTime = occasionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  function formatOccasionTitle(occasion: Occasion): string {
    const recipientName = occasion.recipient?.name || "Unknown";
    const shortName = formatShortName(recipientName);
    const occasionType = occasion.occasion_type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    // Handle possessive correctly
    const possessive = shortName.endsWith("s")
      ? `${shortName}'`
      : `${shortName}'s`;
    return `${possessive} ${occasionType}`;
  }

  function handleAddOccasionForRecipient(recipientId: string) {
    setShowRecipientPicker(false);
    router.push(`/contacts/${recipientId}?addOccasion=true`);
  }

  function handleOccasionPress(occasion: Occasion) {
    router.push(`/contacts/${occasion.recipient_id}?tab=gifts`);
  }

  function handleOccasionLongPress(occasion: Occasion) {
    setOccasionToDelete(occasion);
  }

  function handleConfirmDelete() {
    if (!occasionToDelete || !user) return;
    deleteOccasion.mutate(
      { occasionId: occasionToDelete.id, recipientId: occasionToDelete.recipient_id },
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

  const groupedOccasions = groupOccasionsByMonth(occasions);
  const sortedMonths = Object.keys(groupedOccasions).sort((a, b) => {
    return (
      new Date(groupedOccasions[a][0].date).getTime() -
      new Date(groupedOccasions[b][0].date).getTime()
    );
  });

  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSpacer} />
        <View style={styles.content}>
          <Text variant="bodyMedium" style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSpacer} />
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>Occasions Calendar</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Please sign in to view your occasions.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerSpacer} />
      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Header section */}
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              Occasions Calendar
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              View all your upcoming occasions
            </Text>
          </View>

          {/* Summary section */}
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text variant="titleMedium" style={styles.occasionsCount}>
                {occasions.length} Occasion{occasions.length !== 1 ? "s" : ""}
              </Text>
              <Button
                mode="contained"
                icon="plus"
                onPress={() => setShowRecipientPicker(true)}
                compact
              >
                Add Occasion
              </Button>
            </View>
          </View>

          {/* Occasions list */}
          {loading ? (
            <Text variant="bodyMedium" style={styles.loadingText}>Loading...</Text>
          ) : occasions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="titleMedium" style={styles.emptyText}>No upcoming occasions</Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Add recipients with birthdays to see occasions here
              </Text>
            </View>
          ) : (
            <View style={styles.occasionsList}>
              {sortedMonths.map((monthKey) => (
                <View key={monthKey} style={styles.monthSection}>
                  <Text variant="titleMedium" style={styles.monthHeader}>{monthKey}</Text>
                  {groupedOccasions[monthKey].map((occasion) => {
                    const daysUntil = calculateDaysUntil(occasion.date);

                    return (
                      <View key={occasion.id} style={styles.occasionCardWrapper}>
                        <MenuCard
                          icon="card-giftcard"
                          title={formatOccasionTitle(occasion)}
                          description={formatDate(occasion.date)}
                          onPress={() => handleOccasionPress(occasion)}
                          onLongPress={() => handleOccasionLongPress(occasion)}
                          rightContent={
                            <View style={styles.daysContainer}>
                              <Text
                                variant="titleLarge"
                                style={styles.daysNumber}
                              >
                                {daysUntil}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={styles.daysLabel}
                              >
                                {daysUntil === 1 ? "day" : "days"}
                              </Text>
                            </View>
                          }
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
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
            <Text variant="bodySmall" style={styles.dialogLabel}>Delete Occasion</Text>
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="headlineSmall">
              Delete {occasionToDelete ? formatOccasionTitle(occasionToDelete) : ""}?
            </Text>
          </Dialog.Content>
          <View style={styles.dialogActions}>
            <Button mode="outlined" onPress={() => setOccasionToDelete(null)} style={styles.dialogButton}>Cancel</Button>
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
            <Text variant="bodySmall" style={styles.dialogLabel}>Add Occasion</Text>
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
            <Button mode="outlined" onPress={() => setShowRecipientPicker(false)} style={styles.dialogButton}>
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
  headerSpacer: {
    height: 0,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    marginBottom: 8,
    color: Colors.darks.black,
  },
  subtitle: {
    color: Colors.darks.black,
    opacity: 0.9,
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  occasionsCount: {
    color: Colors.darks.black,
  },
  loadingText: {
    textAlign: "center",
    color: Colors.darks.black,
    opacity: 0.8,
    fontSize: 16,
    padding: 40,
    position: "relative",
    zIndex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.darks.black,
    marginBottom: 8,
  },
  emptySubtext: {
    color: Colors.darks.black,
    opacity: 0.8,
  },
  occasionsList: {
    gap: 24,
  },
  monthSection: {
    marginBottom: 24,
  },
  monthHeader: {
    color: Colors.darks.black,
    marginBottom: 12,
  },
  occasionCardWrapper: {
    marginBottom: 12,
  },
  daysContainer: {
    alignSelf: "center",
    alignItems: "center",
    marginRight: 20,
  },
  daysNumber: {
    color: Colors.white,
    fontWeight: "700",
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
  daysLabel: {
    color: Colors.white,
    opacity: 0.7,
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
