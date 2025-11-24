import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExtractedData } from "@/hooks/use-add-recipient-flow";

interface DataReviewViewProps {
  extractedData: ExtractedData;
  isSaving: boolean;
  onBack: () => void;
  onDataChange: (data: ExtractedData) => void;
  onSave: () => Promise<void>;
}

export function DataReviewView({
  extractedData,
  isSaving,
  onBack,
  onDataChange,
  onSave,
}: DataReviewViewProps) {
  // Store raw interests text separately to allow free typing
  const [interestsText, setInterestsText] = useState(
    extractedData.interests ? extractedData.interests.join(", ") : ""
  );

  // Sync interestsText when extractedData.interests changes externally
  useEffect(() => {
    setInterestsText(
      extractedData.interests ? extractedData.interests.join(", ") : ""
    );
  }, [extractedData.interests]);

  const updateField = (field: keyof ExtractedData, value: any) => {
    onDataChange({
      ...extractedData,
      [field]: value,
    });
  };

  const updateInterests = (value: string) => {
    // Store raw text value for smooth editing
    setInterestsText(value);

    // Parse into array for data storage (allows spaces and commas during typing)
    const interestsArray = value
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);
    updateField("interests", interestsArray);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#231F20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Recipient Data</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.description}>
          Please review and edit the information we extracted. Make any
          necessary changes before continuing.
        </Text>

        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={extractedData.name || ""}
              onChangeText={(value) => updateField("name", value)}
              placeholder="Enter name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Relationship <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={extractedData.relationship_type || ""}
              onChangeText={(value) => updateField("relationship_type", value)}
              placeholder="e.g., Sister, Friend, Colleague"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Birthday</Text>
            <TextInput
              style={styles.input}
              value={extractedData.birthday || ""}
              onChangeText={(value) => updateField("birthday", value)}
              placeholder="YYYY-MM-DD or MM-DD"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Interests</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={interestsText}
              onChangeText={updateInterests}
              placeholder="e.g., reading, hiking, coffee (comma-separated)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Gift Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gift Preferences</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Emotional Tone</Text>
            <TextInput
              style={styles.input}
              value={extractedData.emotional_tone_preference || ""}
              onChangeText={(value) =>
                updateField("emotional_tone_preference", value)
              }
              placeholder="e.g., warm, professional, playful"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Budget Min</Text>
              <TextInput
                style={styles.input}
                value={extractedData.gift_budget_min?.toString() || ""}
                onChangeText={(value) =>
                  updateField(
                    "gift_budget_min",
                    value ? parseInt(value) : undefined
                  )
                }
                placeholder="$"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Budget Max</Text>
              <TextInput
                style={styles.input}
                value={extractedData.gift_budget_max?.toString() || ""}
                onChangeText={(value) =>
                  updateField(
                    "gift_budget_max",
                    value ? parseInt(value) : undefined
                  )
                }
                placeholder="$"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address (Optional)</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              value={extractedData.address || ""}
              onChangeText={(value) => updateField("address", value)}
              placeholder="123 Main Street"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Address Line 2</Text>
            <TextInput
              style={styles.input}
              value={extractedData.address_line_2 || ""}
              onChangeText={(value) => updateField("address_line_2", value)}
              placeholder="Apt, Suite, etc."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={extractedData.city || ""}
                onChangeText={(value) => updateField("city", value)}
                placeholder="City"
                placeholderTextColor="#999"
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={extractedData.state || ""}
                onChangeText={(value) => updateField("state", value)}
                placeholder="State"
                placeholderTextColor="#999"
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>ZIP Code</Text>
              <TextInput
                style={styles.input}
                value={extractedData.zip_code || ""}
                onChangeText={(value) => updateField("zip_code", value)}
                placeholder="ZIP"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                value={extractedData.country || "US"}
                onChangeText={(value) => updateField("country", value)}
                placeholder="Country"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButtonFooter}
          onPress={onBack}
          disabled={isSaving}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!extractedData.name ||
              !extractedData.relationship_type ||
              isSaving) &&
              styles.saveButtonDisabled,
          ]}
          onPress={onSave}
          disabled={
            !extractedData.name || !extractedData.relationship_type || isSaving
          }
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Continue</Text>
          )}
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#231F20",
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#FF3B30",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#231F20",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
    gap: 12,
  },
  backButtonFooter: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#231F20",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#FFB6C1",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
