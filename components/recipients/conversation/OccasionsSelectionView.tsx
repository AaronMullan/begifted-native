import { useState } from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Text, IconButton, Chip } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { ExtractedData } from "@/hooks/use-add-recipient-flow";
import { DualActionFooter } from "./DualActionFooter";
import {
  useOccasionRecommendations,
  mapRecommendationsToOccasions,
  slugifyOccasionName,
} from "../../../hooks/use-occasion-recommendations";
import {
  lookupOccasionDate,
  getNextOccurrence,
  getNextAnnualOccurrence,
} from "../../../utils/occasion-dates";
import { OccasionItem } from "./OccasionItem";
import { OccasionEditor } from "./OccasionEditor";

interface OccasionsSelectionViewProps {
  extractedData: ExtractedData;
  onBack: () => void;
  onContinue: (
    occasions: { date: string; occasion_type: string }[]
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
    { date: string; occasion_type: string; enabled: boolean }[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingOccasionIndex, setEditingOccasionIndex] = useState<
    number | null
  >(null);
  const [addingCustom, setAddingCustom] = useState(false);

  // Merge conversation-extracted occasions with interest-based AI
  // recommendations. Recomputed during render (not in an effect) via stored
  // previous values whenever the inputs change.
  const [prevOccasions, setPrevOccasions] = useState(extractedData.occasions);
  const [prevBirthday, setPrevBirthday] = useState(extractedData.birthday);
  const [prevRecommendations, setPrevRecommendations] =
    useState(recommendations);
  if (
    extractedData.occasions !== prevOccasions ||
    extractedData.birthday !== prevBirthday ||
    recommendations !== prevRecommendations
  ) {
    setPrevOccasions(extractedData.occasions);
    setPrevBirthday(extractedData.birthday);
    setPrevRecommendations(recommendations);
    const merged: {
      date: string;
      occasion_type: string;
      enabled: boolean;
    }[] = [];

    const fromConversation: typeof merged = [];
    for (const occ of extractedData.occasions ?? []) {
      const type = occ.occasion_type || "custom";

      // Skip hallucinated birthdays — we use extractedData.birthday directly
      if (type === "birthday") continue;

      // For known occasion types, always use our authoritative date calculator
      const knownDate = lookupOccasionDate(type);
      if (knownDate) {
        fromConversation.push({
          date: knownDate,
          occasion_type: type,
          enabled: true,
        });
        continue;
      }

      // Unknown/custom types with a valid future date — keep as-is
      const raw = occ.date?.trim() || "";
      const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;
      if (raw && isoDateRe.test(raw)) {
        fromConversation.push({
          date: getNextOccurrence(raw),
          occasion_type: type,
          enabled: true,
        });
      }
      // Otherwise drop it — we can't verify the occasion
    }
    // Add birthday from the verified extractedData field (not AI occasions).
    // Annual: ignore any year the extraction supplied — a spurious future
    // year would otherwise be stored verbatim and push the occasion a year out.
    if (extractedData.birthday) {
      const bdayDate = getNextAnnualOccurrence(extractedData.birthday);
      fromConversation.unshift({
        date: bdayDate,
        occasion_type: "birthday",
        enabled: true,
      });
    }

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
  }

  const toggleOccasion = (index: number) => {
    setSelectedOccasions((prev) =>
      prev.map((occ, i) =>
        i === index ? { ...occ, enabled: !occ.enabled } : occ
      )
    );
  };

  // Secondary/discovery occasions the AI surfaced as plain names (no dates).
  // Offer the ones not already tracked as tappable chips.
  const existingTypes = new Set(selectedOccasions.map((o) => o.occasion_type));
  const availableSuggestions = (recommendations?.additionalSuggestions ?? [])
    .map((name) => ({ name, slug: slugifyOccasionName(name) }))
    .filter(({ slug }) => slug.length > 0 && !existingTypes.has(slug));

  const handleSaveCustomOccasion = (
    date: string,
    _isAnnual: boolean,
    name?: string
  ) => {
    const slug = name ? slugifyOccasionName(name) : "";
    if (!slug || selectedOccasions.some((o) => o.occasion_type === slug)) {
      return;
    }
    setSelectedOccasions((prev) => [
      ...prev,
      { date, occasion_type: slug, enabled: true },
    ]);
  };

  const handleAddSuggestion = (slug: string) => {
    if (selectedOccasions.some((o) => o.occasion_type === slug)) return;
    // Resolve a date for known holidays; otherwise add undated and open the
    // editor so the user can set one (OccasionItem shows "Add Date").
    const resolved = lookupOccasionDate(slug);
    const newIndex = selectedOccasions.length;
    setSelectedOccasions((prev) => [
      ...prev,
      { date: resolved ?? "", occasion_type: slug, enabled: true },
    ]);
    if (!resolved) setEditingOccasionIndex(newIndex);
  };

  const handleContinue = async () => {
    if (isProcessing) return; // Prevent double-clicks

    setIsProcessing(true);
    try {
      // Drop occasions without a valid date (e.g. a tapped suggestion the user
      // never dated) — an empty date fails the occasions batch insert.
      const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;
      const enabledOccasions = selectedOccasions
        .filter((occ) => occ.enabled && isoDateRe.test(occ.date.trim()))
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

  const handleSaveOccasionDate = (date: string, _isAnnual: boolean) => {
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
          We&apos;ve suggested occasions based on your conversation and their
          interests. Add or remove any you&apos;d like to track.
        </Text>

        {selectedOccasions.length === 0 && isLoadingRecommendations ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#000" />
            <Text
              variant="bodyMedium"
              style={[styles.emptySubtext, { marginTop: 16 }]}
            >
              Loading additional occasion ideas…
            </Text>
          </View>
        ) : selectedOccasions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="calendar-today" size={48} color="#999" />
            <Text variant="titleLarge" style={styles.emptyText}>
              No occasions found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Occasions will be added from birthday and holidays you mentioned —
              or tap &quot;Add your own&quot; below.
            </Text>
          </View>
        ) : (
          <>
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
            {isLoadingRecommendations && (
              <View style={styles.loadingMoreRow}>
                <ActivityIndicator size="small" color="#000" />
                <Text variant="bodyMedium" style={styles.loadingMoreText}>
                  Loading additional occasion ideas…
                </Text>
              </View>
            )}
          </>
        )}

        {!isLoadingRecommendations && (
          <View style={styles.suggestionsSection}>
            <Text variant="titleSmall" style={styles.suggestionsTitle}>
              Also consider
            </Text>
            <Text variant="bodySmall" style={styles.suggestionsSubtext}>
              Tap to add a suggestion to the list above.
            </Text>
            <View style={styles.suggestionsChips}>
              {availableSuggestions.map(({ name, slug }) => (
                <Chip
                  key={slug}
                  mode="outlined"
                  icon="plus"
                  onPress={() => handleAddSuggestion(slug)}
                  style={styles.suggestionChip}
                >
                  {name}
                </Chip>
              ))}
              <Chip
                mode="outlined"
                icon="plus"
                onPress={() => setAddingCustom(true)}
                style={styles.suggestionChip}
              >
                Add your own
              </Chip>
            </View>
          </View>
        )}
      </ScrollView>

      <DualActionFooter
        secondaryLabel="Skip"
        onSecondary={onSkip}
        secondaryDisabled={isProcessing}
        onPrimary={handleContinue}
        primaryDisabled={isProcessing}
        primaryLoading={isProcessing}
      />

      {editingOccasionIndex !== null && (
        <OccasionEditor
          occasion={selectedOccasions[editingOccasionIndex]}
          visible={editingOccasionIndex !== null}
          onClose={handleCloseEditor}
          onSave={handleSaveOccasionDate}
          showRecurrence={false}
        />
      )}

      {addingCustom && (
        <OccasionEditor
          occasion={{ date: "", occasion_type: "" }}
          visible={addingCustom}
          onClose={() => setAddingCustom(false)}
          onSave={handleSaveCustomOccasion}
          showRecurrence={false}
          editableName
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // 44pt min tap target (HIG); transparent container, 24pt icon unchanged.
  backButton: {
    margin: 0,
    width: 44,
    height: 44,
  },
  headerTitle: {},
  // Matches backButton width so the title stays centered.
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 16,
    marginHorizontal: 8,
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
  loadingMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  loadingMoreText: {
    color: "#666",
  },
  occasionsList: {
    gap: 12,
  },
  suggestionsSection: {
    marginTop: 24,
  },
  suggestionsTitle: {
    marginBottom: 4,
  },
  suggestionsSubtext: {
    marginBottom: 12,
    color: "#666",
  },
  suggestionsChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: "transparent",
  },
});
