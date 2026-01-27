import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { IconButton } from "react-native-paper";
import { BlurView } from "expo-blur";
import { Colors } from "../lib/colors";
import { supabase } from "../lib/supabase";
import { Recipient } from "../types/recipient";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { useOccasions } from "../hooks/use-occasions";
import { HEADER_HEIGHT } from "../lib/constants";

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
  const { user } = useAuth();
  const { data: occasions = [], isLoading: loading } = useOccasions();
  const { showToast, toast } = useToast();

  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

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

  if (!user) {
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
          {/* Main card container */}
          <Pressable style={styles.mainCard}>
            <BlurView intensity={20} style={styles.blurBackground} />
            {/* Header section */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Occasions Calendar</Text>
                <Text style={styles.subtitle}>
                  View all your upcoming occasions
                </Text>
              </View>
              <IconButton
                icon="arrow-left"
                size={20}
                iconColor="#000000"
                onPress={() => router.back()}
                style={styles.backButton}
              />
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
                  <MaterialIcons name="add" size={20} color="white" />
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
                        <Pressable
                          key={occasion.id}
                          style={styles.occasionCard}
                          onPress={() => handleOccasionPress(occasion)}
                        >
                          <BlurView intensity={20} style={styles.occasionBlurBackground} />
                          <View style={styles.occasionIconContainer}>
                            <MaterialIcons
                              name="card-giftcard"
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
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
    paddingTop: HEADER_HEIGHT, // Account for header height
  },
  mainCard: {
    backgroundColor: Colors.neutrals.light + "30", // Low opacity (~19%)
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    overflow: "hidden",
    position: "relative",
    padding: 24,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    position: "relative",
    zIndex: 1,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.darks.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.darks.black,
    opacity: 0.9,
  },
  backButton: {
    margin: 0,
  },
  summarySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
    zIndex: 1,
  },
  occasionsCount: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.darks.black,
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
    position: "relative",
    zIndex: 1,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.darks.black,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.darks.black,
    opacity: 0.8,
  },
  occasionsList: {
    gap: 24,
    position: "relative",
    zIndex: 1,
  },
  monthSection: {
    marginBottom: 24,
  },
  monthHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.darks.black,
    marginBottom: 12,
  },
  occasionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutrals.light + "30", // Low opacity
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    position: "relative",
  },
  occasionBlurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
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
    color: Colors.darks.black,
    marginBottom: 4,
  },
  occasionDate: {
    fontSize: 14,
    color: Colors.darks.black,
    opacity: 0.8,
    marginBottom: 4,
  },
  occasionRelationship: {
    fontSize: 14,
    color: Colors.darks.black,
    opacity: 0.7,
  },
  occasionRight: {
    alignItems: "flex-end",
    position: "relative",
    zIndex: 1,
  },
  daysUntil: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  daysUntilOrange: {
    color: Colors.darks.black,
  },
  daysUntilGreen: {
    color: Colors.darks.black,
    opacity: 0.8,
  },
  customLabel: {
    fontSize: 12,
    color: "#999",
  },
});
