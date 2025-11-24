import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExtractedData } from "@/hooks/use-add-recipient-flow";

interface OccasionsSelectionViewProps {
  extractedData: ExtractedData;
  onBack: () => void;
  onContinue: (
    occasions: Array<{ date: string; occasion_type: string }>
  ) => Promise<void>;
  onSkip: () => Promise<void>;
}

interface OccasionOption {
  id: string;
  label: string;
  type: string;
  defaultDate?: string; // For birthdays from extracted data
}

export function OccasionsSelectionView({
  extractedData,
  onBack,
  onContinue,
  onSkip,
}: OccasionsSelectionViewProps) {
  const [selectedOccasions, setSelectedOccasions] = useState<
    Array<{ date: string; occasion_type: string; enabled: boolean }>
  >([]);

  useEffect(() => {
    // Initialize with occasions from extractedData
    const initialOccasions: Array<{
      date: string;
      occasion_type: string;
      enabled: boolean;
    }> = [];

    // First, add any occasions that were extracted from the conversation (holidays, etc.)
    if (extractedData.occasions && extractedData.occasions.length > 0) {
      extractedData.occasions.forEach((occasion) => {
        initialOccasions.push({
          date: occasion.date,
          occasion_type: occasion.occasion_type || "custom",
          enabled: true,
        });
      });
    }

    // Then, add birthday occasions if birthday exists
    if (extractedData.birthday) {
      // Parse birthday to create occasion dates
      const birthdayParts = extractedData.birthday.split("-");
      if (birthdayParts.length >= 2) {
        let month: number;
        let day: number;

        if (birthdayParts.length === 3) {
          // Format: YYYY-MM-DD - ignore the year, use only month and day
          month = parseInt(birthdayParts[1], 10);
          day = parseInt(birthdayParts[2], 10);
        } else {
          // Format: MM-DD
          month = parseInt(birthdayParts[0], 10);
          day = parseInt(birthdayParts[1], 10);
        }

        // Validate month and day
        if (
          isNaN(month) ||
          isNaN(day) ||
          month < 1 ||
          month > 12 ||
          day < 1 ||
          day > 31
        ) {
          console.warn("Invalid birthday format:", extractedData.birthday);
        } else {
          // Get today's date in local timezone
          const todayLocal = new Date();
          todayLocal.setHours(0, 0, 0, 0);
          const currentYear = todayLocal.getFullYear();

          // Create date strings directly in ISO format to avoid timezone issues
          const formatDateString = (
            year: number,
            month: number,
            day: number
          ): string => {
            const monthStr = month.toString().padStart(2, "0");
            const dayStr = day.toString().padStart(2, "0");
            return `${year}-${monthStr}-${dayStr}`;
          };

          const thisYearDateStr = formatDateString(currentYear, month, day);
          const nextYearDateStr = formatDateString(currentYear + 1, month, day);

          // Compare dates as strings in local timezone
          const todayStr = formatDateString(
            todayLocal.getFullYear(),
            todayLocal.getMonth() + 1,
            todayLocal.getDate()
          );

          const nextYearLocal = new Date(todayLocal);
          nextYearLocal.setFullYear(nextYearLocal.getFullYear() + 1);
          const nextYearStr = formatDateString(
            nextYearLocal.getFullYear(),
            nextYearLocal.getMonth() + 1,
            nextYearLocal.getDate()
          );

          if (thisYearDateStr >= todayStr && thisYearDateStr <= nextYearStr) {
            initialOccasions.push({
              date: thisYearDateStr,
              occasion_type: "birthday",
              enabled: true,
            });
          }

          if (nextYearDateStr <= nextYearStr) {
            initialOccasions.push({
              date: nextYearDateStr,
              occasion_type: "birthday",
              enabled: true,
            });
          }
        }
      }
    }

    setSelectedOccasions(initialOccasions);
  }, [extractedData.birthday, extractedData.occasions]);

  const toggleOccasion = (index: number) => {
    setSelectedOccasions((prev) =>
      prev.map((occ, i) =>
        i === index ? { ...occ, enabled: !occ.enabled } : occ
      )
    );
  };

  const handleContinue = async () => {
    const enabledOccasions = selectedOccasions
      .filter((occ) => occ.enabled)
      .map((occ) => ({
        date: occ.date,
        occasion_type: occ.occasion_type,
      }));

    await onContinue(enabledOccasions);
  };

  const formatDate = (dateString: string): string => {
    // Parse date string (YYYY-MM-DD) manually to avoid timezone issues
    const parts = dateString.split("-");
    if (parts.length !== 3) {
      // Fallback to Date parsing if format is unexpected
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
    const day = parseInt(parts[2], 10);

    // Create date in local timezone (not UTC)
    const date = new Date(year, month, day);

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatOccasionType = (type: string): string => {
    // Capitalize first letter and handle common types
    const formatted = type.charAt(0).toUpperCase() + type.slice(1);
    // Replace underscores with spaces for better display
    return formatted.replace(/_/g, " ");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#231F20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Occasions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.description}>
          Select which occasions you'd like to track for this recipient. We've
          automatically added occasions based on your conversation.
        </Text>

        {selectedOccasions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>No occasions found</Text>
            <Text style={styles.emptySubtext}>
              Occasions will be automatically created from the birthday and
              holidays you mentioned.
            </Text>
          </View>
        ) : (
          <View style={styles.occasionsList}>
            {selectedOccasions.map((occasion, index) => (
              <View key={index} style={styles.occasionItem}>
                <View style={styles.occasionContent}>
                  <View style={styles.occasionIcon}>
                    <Ionicons name="gift-outline" size={24} color="#FFB6C1" />
                  </View>
                  <View style={styles.occasionDetails}>
                    <Text style={styles.occasionType}>
                      {formatOccasionType(occasion.occasion_type)}
                    </Text>
                    <Text style={styles.occasionDate}>
                      {formatDate(occasion.date)}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={occasion.enabled}
                  onValueChange={() => toggleOccasion(index)}
                  trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
                  thumbColor={occasion.enabled ? "#FF6B9D" : "#f4f3f4"}
                  ios_backgroundColor="#E0E0E0"
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#231F20",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#231F20",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  occasionsList: {
    gap: 12,
  },
  occasionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  occasionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  occasionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF0F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  occasionDetails: {
    flex: 1,
  },
  occasionType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 4,
  },
  occasionDate: {
    fontSize: 14,
    color: "#666",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#231F20",
  },
  continueButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#FFB6C1",
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
