import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
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
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          disabled={isProcessing}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.continueButton,
            isProcessing && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={isProcessing}
        >
          <Text style={styles.continueButtonText}>
            {isProcessing ? "Processing..." : "Continue"}
          </Text>
        </TouchableOpacity>
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
  continueButtonDisabled: {
    opacity: 0.6,
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
