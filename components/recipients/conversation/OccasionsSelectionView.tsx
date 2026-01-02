import { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, IconButton, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { ExtractedData } from "@/hooks/use-add-recipient-flow";
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
  const [selectedOccasions, setSelectedOccasions] = useState<
    Array<{ date: string; occasion_type: string; enabled: boolean }>
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingOccasionIndex, setEditingOccasionIndex] = useState<number | null>(null);

  useEffect(() => {
    const initialOccasions: Array<{
      date: string;
      occasion_type: string;
      enabled: boolean;
    }> = [];

    if (extractedData.occasions && extractedData.occasions.length > 0) {
      extractedData.occasions.forEach((occasion) => {
        initialOccasions.push({
          date: occasion.date,
          occasion_type: occasion.occasion_type || "custom",
          enabled: true,
        });
      });
    }

    setSelectedOccasions(initialOccasions);
  }, [extractedData.occasions]);

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
          icon="arrow-back"
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
          Select which occasions you'd like to track for this recipient. We've
          automatically added occasions based on your conversation.
        </Text>

        {selectedOccasions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#999" />
            <Text variant="titleLarge" style={styles.emptyText}>
              No occasions found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Occasions will be automatically created from the birthday and
              holidays you mentioned.
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
