import { ExtractedData } from "@/hooks/use-add-recipient-flow";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { HelperText, IconButton, Text, TextInput } from "react-native-paper";
import { Colors } from "@/lib/colors";
import { DualActionFooter } from "./DualActionFooter";
import {
  formatBirthdayDisplay,
  isInvalidBirthdayInput,
} from "@/utils/birthday";
import { KEYBOARD_CTA_GAP } from "@/lib/constants";

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
  // Store raw interests text separately to allow free typing. Re-sync during
  // render (not in an effect) when the incoming prop changes externally, using
  // a stored previous value to detect the change — the documented alternative
  // to a setState-in-effect sync.
  const [interestsText, setInterestsText] = useState(
    extractedData.interests ? extractedData.interests.join(", ") : ""
  );
  const [prevInterests, setPrevInterests] = useState(extractedData.interests);
  if (extractedData.interests !== prevInterests) {
    setPrevInterests(extractedData.interests);
    setInterestsText(
      extractedData.interests ? extractedData.interests.join(", ") : ""
    );
  }

  // Show the birthday in customary "Month Day, Year" form rather than raw ISO.
  // Fall back to the raw value while it's mid-edit/unparseable so we never blank
  // out what the user is typing; the save path normalizes it.
  const [birthdayText, setBirthdayText] = useState(
    formatBirthdayDisplay(extractedData.birthday) ||
      extractedData.birthday ||
      ""
  );
  const [prevBirthday, setPrevBirthday] = useState(extractedData.birthday);
  if (extractedData.birthday !== prevBirthday) {
    setPrevBirthday(extractedData.birthday);
    setBirthdayText(
      formatBirthdayDisplay(extractedData.birthday) ||
        extractedData.birthday ||
        ""
    );
  }

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={KEYBOARD_CTA_GAP}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#000000"
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
              value={birthdayText}
              onChangeText={(value) => {
                setBirthdayText(value);
                updateField("birthday", value);
              }}
              placeholder="December 7, 1990 or December 7"
              error={isInvalidBirthdayInput(birthdayText)}
              style={styles.input}
            />
            {isInvalidBirthdayInput(birthdayText) && (
              <HelperText type="error" visible>
                Use a date like December 7, 1990, or December 7 if the year is
                unknown.
              </HelperText>
            )}
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
      <DualActionFooter
        secondaryLabel="Back"
        onSecondary={onBack}
        secondaryDisabled={isSaving}
        onPrimary={onSave}
        primaryDisabled={
          !extractedData.name || !extractedData.relationship_type || isSaving
        }
        primaryLoading={isSaving}
      />
    </KeyboardAvoidingView>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.brand.beigeLight,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
});
