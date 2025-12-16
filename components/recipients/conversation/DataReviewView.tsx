import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import {
  Text,
  TextInput,
  IconButton,
  Button,
  ActivityIndicator,
} from "react-native-paper";
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
        <IconButton
          icon="arrow-back"
          size={24}
          iconColor="#231F20"
          onPress={onBack}
          style={styles.backButton}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          Review Recipient Data
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text variant="bodyMedium" style={styles.description}>
          Please review and edit the information we extracted. Make any
          necessary changes before continuing.
        </Text>

        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Basic Information
          </Text>

          <View style={styles.fieldContainer}>
            <TextInput
              mode="outlined"
              label="Name *"
              value={extractedData.name || ""}
              onChangeText={(value) => updateField("name", value)}
              placeholder="Enter name"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldContainer}>
            <TextInput
              mode="outlined"
              label="Relationship *"
              value={extractedData.relationship_type || ""}
              onChangeText={(value) => updateField("relationship_type", value)}
              placeholder="e.g., Sister, Friend, Colleague"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldContainer}>
            <TextInput
              mode="outlined"
              label="Birthday"
              value={extractedData.birthday || ""}
              onChangeText={(value) => updateField("birthday", value)}
              placeholder="YYYY-MM-DD or MM-DD"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldContainer}>
            <TextInput
              mode="outlined"
              label="Interests"
              value={interestsText}
              onChangeText={updateInterests}
              placeholder="e.g., reading, hiking, coffee (comma-separated)"
              multiline
              numberOfLines={3}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>
        </View>

        {/* Gift Preferences Section */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Gift Preferences
          </Text>

          <View style={styles.fieldContainer}>
            <TextInput
              mode="outlined"
              label="Emotional Tone"
              value={extractedData.emotional_tone_preference || ""}
              onChangeText={(value) =>
                updateField("emotional_tone_preference", value)
              }
              placeholder="e.g., warm, professional, playful"
              style={styles.input}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <TextInput
                mode="outlined"
                label="Budget Min"
                value={extractedData.gift_budget_min?.toString() || ""}
                onChangeText={(value) =>
                  updateField(
                    "gift_budget_min",
                    value ? parseInt(value) : undefined
                  )
                }
                placeholder="$"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <TextInput
                mode="outlined"
                label="Budget Max"
                value={extractedData.gift_budget_max?.toString() || ""}
                onChangeText={(value) =>
                  updateField(
                    "gift_budget_max",
                    value ? parseInt(value) : undefined
                  )
                }
                placeholder="$"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Address (Optional)
          </Text>

          <View style={styles.fieldContainer}>
            <TextInput
              mode="outlined"
              label="Street Address"
              value={extractedData.address || ""}
              onChangeText={(value) => updateField("address", value)}
              placeholder="123 Main Street"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldContainer}>
            <TextInput
              mode="outlined"
              label="Address Line 2"
              value={extractedData.address_line_2 || ""}
              onChangeText={(value) => updateField("address_line_2", value)}
              placeholder="Apt, Suite, etc."
              style={styles.input}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <TextInput
                mode="outlined"
                label="City"
                value={extractedData.city || ""}
                onChangeText={(value) => updateField("city", value)}
                placeholder="City"
                style={styles.input}
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <TextInput
                mode="outlined"
                label="State"
                value={extractedData.state || ""}
                onChangeText={(value) => updateField("state", value)}
                placeholder="State"
                maxLength={2}
                autoCapitalize="characters"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <TextInput
                mode="outlined"
                label="ZIP Code"
                value={extractedData.zip_code || ""}
                onChangeText={(value) => updateField("zip_code", value)}
                placeholder="ZIP"
                keyboardType="numeric"
                maxLength={10}
                style={styles.input}
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <TextInput
                mode="outlined"
                label="Country"
                value={extractedData.country || "US"}
                onChangeText={(value) => updateField("country", value)}
                placeholder="Country"
                style={styles.input}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={onBack}
          disabled={isSaving}
          style={styles.backButtonFooter}
        >
          Back
        </Button>

        <Button
          mode="contained"
          buttonColor="#FFB6C1"
          onPress={onSave}
          disabled={
            !extractedData.name || !extractedData.relationship_type || isSaving
          }
          loading={isSaving}
          style={styles.saveButton}
        >
          Continue
        </Button>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  input: {},
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
  },
  saveButton: {
    flex: 1,
  },
});
