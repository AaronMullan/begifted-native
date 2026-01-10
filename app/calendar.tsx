import { Ionicons } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { Recipient } from "../types/recipient";
import { useToast } from "../hooks/use-toast";

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
  const [session, setSession] = useState<Session | null>(null);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { showToast, toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchOccasions(session.user.id);
      } else {
        setLoading(false);
        router.replace("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchOccasions(session.user.id);
      } else {
        setOccasions([]);
        setLoading(false);
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchOccasions(userId: string) {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch occasions
      const { data: occasionsData, error: occasionsError } = await supabase
        .from("occasions")
        .select("id, date, occasion_type, recipient_id")
        .eq("user_id", userId)
        .gte("date", today.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (occasionsError) {
        console.error("Error fetching occasions:", occasionsError);
        // If occasions table doesn't exist, set empty array
        setOccasions([]);
        return;
      }

      if (!occasionsData || occasionsData.length === 0) {
        setOccasions([]);
        return;
      }

      // Fetch recipients for the occasions
      const recipientIds = [
        ...new Set(occasionsData.map((o) => o.recipient_id)),
      ];
      const { data: recipientsData, error: recipientsError } = await supabase
        .from("recipients")
        .select("id, name, relationship_type")
        .in("id", recipientIds);

      if (recipientsError) {
        console.error("Error fetching recipients:", recipientsError);
      }

      // Create a map of recipients for quick lookup
      const recipientsMap = new Map(
        (recipientsData || []).map((r) => [r.id, r])
      );

      // Transform the data to include recipient info
      const transformedOccasions: Occasion[] = occasionsData.map(
        (occasion: any) => {
          const recipient = recipientsMap.get(occasion.recipient_id);
          return {
            id: occasion.id,
            date: occasion.date,
            occasion_type: occasion.occasion_type || "birthday",
            recipient_id: occasion.recipient_id,
            recipient: recipient
              ? {
                  name: recipient.name,
                  relationship_type: recipient.relationship_type,
                }
              : undefined,
          };
        }
      );

      setOccasions(transformedOccasions);
    } catch (error) {
      console.error("Error fetching occasions:", error);
      setOccasions([]);
    } finally {
      setLoading(false);
    }
  }

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
    const occasionType =
      occasion.occasion_type === "custom" ? "custom" : "birthday";
    // Handle possessive correctly
    const possessive = recipientName.endsWith("s")
      ? `${recipientName}'`
      : `${recipientName}'s`;
    return `${possessive} ${occasionType}`;
  }

  function handleOccasionPress(occasion: Occasion) {
    router.push(`/contacts/${occasion.recipient_id}?tab=gifts`);
  }

  const groupedOccasions = groupOccasionsByMonth(occasions);
  const sortedMonths = Object.keys(groupedOccasions).sort((a, b) => {
    return (
      new Date(groupedOccasions[a][0].date).getTime() -
      new Date(groupedOccasions[b][0].date).getTime()
    );
  });

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Occasions Calendar</Text>
          <Text style={styles.subtitle}>
            Please sign in to view your occasions.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Main white card container */}
          <View style={styles.mainCard}>
            {/* Header section */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Occasions Calendar</Text>
                <Text style={styles.subtitle}>
                  View all your upcoming occasions
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={20} color="#000000" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </View>

            {/* Summary section */}
            <View style={styles.summarySection}>
              <Text style={styles.occasionsCount}>
                {occasions.length} Occasion{occasions.length !== 1 ? "s" : ""}
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push("/contacts" as any)}
              >
                <View style={styles.addButtonContent}>
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.addButtonText}>Add Recipient</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Occasions list */}
            {loading ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : occasions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No upcoming occasions</Text>
                <Text style={styles.emptySubtext}>
                  Add recipients with birthdays to see occasions here
                </Text>
              </View>
            ) : (
              <View style={styles.occasionsList}>
                {sortedMonths.map((monthKey) => (
                  <View key={monthKey} style={styles.monthSection}>
                    <Text style={styles.monthHeader}>{monthKey}</Text>
                    {groupedOccasions[monthKey].map((occasion) => {
                      const daysUntil = calculateDaysUntil(occasion.date);
                      const isCustom = occasion.occasion_type === "custom";

                      return (
                        <TouchableOpacity
                          key={occasion.id}
                          style={styles.occasionCard}
                          onPress={() => handleOccasionPress(occasion)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.occasionIconContainer}>
                            <Ionicons
                              name="gift-outline"
                              size={24}
                              color="white"
                            />
                          </View>
                          <View style={styles.occasionInfo}>
                            <Text style={styles.occasionTitle}>
                              {formatOccasionTitle(occasion)}
                            </Text>
                            <Text style={styles.occasionDate}>
                              {formatDate(occasion.date)}
                            </Text>
                            <Text style={styles.occasionRelationship}>
                              {occasion.recipient?.relationship_type || ""}
                            </Text>
                          </View>
                          <View style={styles.occasionRight}>
                            <Text
                              style={[
                                styles.daysUntil,
                                daysUntil <= 30
                                  ? styles.daysUntilOrange
                                  : styles.daysUntilGreen,
                              ]}
                            >
                              {daysUntil} day{daysUntil !== 1 ? "s" : ""}
                            </Text>
                            {isCustom && (
                              <Text style={styles.customLabel}>Custom</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // White background
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  mainCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    fontSize: 14,
    color: "#000000",
    marginLeft: 4,
    fontWeight: "500",
  },
  summarySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  occasionsCount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  addButton: {
    borderRadius: 8,
    backgroundColor: "#000000", // Black background
    overflow: "hidden",
  },
  addButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    padding: 40,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  occasionsList: {
    gap: 24,
  },
  monthSection: {
    marginBottom: 24,
  },
  monthHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 12,
  },
  occasionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  occasionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFB6C1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  occasionInfo: {
    flex: 1,
  },
  occasionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  occasionDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  occasionRelationship: {
    fontSize: 14,
    color: "#999",
  },
  occasionRight: {
    alignItems: "flex-end",
  },
  daysUntil: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  daysUntilOrange: {
    color: "#333333",
  },
  daysUntilGreen: {
    color: "#666666",
  },
  customLabel: {
    fontSize: 12,
    color: "#999",
  },
});
