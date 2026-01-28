import { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Text, IconButton, Button } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { ExtractedData } from "@/hooks/use-add-recipient-flow";
import {
  useOccasionRecommendations,
  mapRecommendationsToOccasions,
} from "../../../hooks/use-occasion-recommendations";
import {
  lookupOccasionDate,
  getNextOccurrence,
} from "../../../utils/occasion-dates";
import { OccasionItem } from "./OccasionItem";
import { OccasionEditor } from "./OccasionEditor";

interface OccasionsSelectionViewProps {
  extractedData: ExtractedData;
  onBack: () => void;
  onContinue: (
    occasions: Array<{ date: string; occasion_type: string }>
  ) => Promise<void>;
  onSkip: () => Promise<void>;
}

export function OccasionsSelectionView({
  extractedData,
  onBack,
  onContinue,
  onSkip,
}: OccasionsSelectionViewProps) {
  const { recommendations, isLoading: isLoadingRecommendations } =
    useOccasionRecommendations(extractedData);

  const [selectedOccasions, setSelectedOccasions] = useState<
    Array<{ date: string; occasion_type: string; enabled: boolean }>
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingOccasionIndex, setEditingOccasionIndex] = useState<
    number | null
  >(null);

  // Merge conversation-extracted occasions with interest-based AI recommendations
  useEffect(() => {
    const merged: Array<{
      date: string;
      occasion_type: string;
      enabled: boolean;
    }> = [];

    const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;
    const fromConversation = (extractedData.occasions ?? []).map((occ) => {
      const type = occ.occasion_type || "custom";
      let date = occ.date?.trim() || "";
      const useLookup =
        !date ||
        date.includes("01-01") ||
        !isoDateRe.test(date) ||
        new Date(date).getTime() < new Date().setHours(0, 0, 0, 0);
      if (useLookup) {
        const lookedUp = lookupOccasionDate(type);
        date = lookedUp ?? "2025-01-01";
      } else {
        date = getNextOccurrence(date);
      }
      return { date, occasion_type: type, enabled: true };
    });
    const seen = new Set<string>();
    fromConversation.forEach((o) => {
      merged.push(o);
      seen.add(o.occasion_type);
    });

    const fromRecommendations = mapRecommendationsToOccasions(recommendations);
    fromRecommendations.forEach((o) => {
      if (!seen.has(o.occasion_type)) {
        merged.push(o);
        seen.add(o.occasion_type);
      }
    });

    setSelectedOccasions(merged);
  }, [extractedData.occasions, recommendations]);

  const toggleOccasion = (index: number) => {
    setSelectedOccasions((prev) =>
      prev.map((occ, i) =>
        i === index ? { ...occ, enabled: !occ.enabled } : occ
      )
    );
  };

  const handleContinue = async () => {
    if (isProcessing) return; // Prevent double-clicks

    setIsProcessing(true);
    try {
      const enabledOccasions = selectedOccasions
        .filter((occ) => occ.enabled)
        .map((occ) => ({
          date: occ.date,
          occasion_type: occ.occasion_type,
        }));

      await onContinue(enabledOccasions);
    } catch (error) {
      console.error("Error in handleContinue:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditOccasion = (index: number) => {
    setEditingOccasionIndex(index);
  };

  const handleSaveOccasionDate = (date: string) => {
    if (editingOccasionIndex !== null) {
      setSelectedOccasions((prev) =>
        prev.map((occ, i) =>
          i === editingOccasionIndex ? { ...occ, date } : occ
        )
      );
      setEditingOccasionIndex(null);
    }
  };

  const handleCloseEditor = () => {
    setEditingOccasionIndex(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#000000"
          onPress={onBack}
          style={styles.backButton}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          Select Occasions
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text variant="bodyMedium" style={styles.description}>
          We've suggested occasions based on your conversation and their
          interests. Add or remove any you'd like to track.
        </Text>

        {selectedOccasions.length === 0 && isLoadingRecommendations ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#000" />
            <Text variant="bodyMedium" style={[styles.emptySubtext, { marginTop: 16 }]}>
              Finding occasions that match their interests…
            </Text>
          </View>
        ) : selectedOccasions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="calendar-today" size={48} color="#999" />
            <Text variant="titleLarge" style={styles.emptyText}>
              No occasions found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Occasions will be added from birthday and holidays you mentioned, or
              add your own after continuing.
            </Text>
          </View>
        ) : (
          <View style={styles.occasionsList}>
            {selectedOccasions.map((occasion, index) => (
              <OccasionItem
                key={index}
                occasion={occasion}
                onToggle={() => toggleOccasion(index)}
                onEdit={() => handleEditOccasion(index)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={onSkip}
          disabled={isProcessing}
          style={styles.skipButton}
        >
          Skip
        </Button>

        <Button
          mode="contained"
          buttonColor="#000000"
          onPress={handleContinue}
          disabled={isProcessing}
          loading={isProcessing}
          style={styles.continueButton}
        >
          Continue
        </Button>
      </View>

      {editingOccasionIndex !== null && (
        <OccasionEditor
          occasion={selectedOccasions[editingOccasionIndex]}
          visible={editingOccasionIndex !== null}
          onClose={handleCloseEditor}
          onSave={handleSaveOccasionDate}
        />
      )}
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
    margin: 0,
  },
  headerTitle: {},
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
    marginBottom: 24,
    lineHeight: 20,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: "center",
    color: "#666",
  },
  occasionsList: {
    gap: 12,
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
  },
  continueButton: {
    flex: 1,
  },
});
