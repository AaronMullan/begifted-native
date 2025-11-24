import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { ExtractedData } from "@/hooks/use-add-recipient-flow";

interface ManualDataEntryProps {
  partialData: ExtractedData | null;
  onComplete: (data: ExtractedData) => void;
  onCancel: () => void;
}

export function ManualDataEntry({
  partialData,
  onComplete,
  onCancel,
}: ManualDataEntryProps) {
  const [name, setName] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [interests, setInterests] = useState("");
  const [birthday, setBirthday] = useState("");
  const [emotionalTone, setEmotionalTone] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [address, setAddress] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("US");

  useEffect(() => {
    // Pre-populate with partial data if available
    if (partialData) {
      setName(partialData.name || "");
      setRelationshipType(partialData.relationship_type || "");
      setInterests(
        partialData.interests ? partialData.interests.join(", ") : ""
      );
      setBirthday(partialData.birthday || "");
      setEmotionalTone(partialData.emotional_tone_preference || "");
      setBudgetMin(partialData.gift_budget_min?.toString() || "");
      setBudgetMax(partialData.gift_budget_max?.toString() || "");
      setAddress(partialData.address || "");
      setAddressLine2(partialData.address_line_2 || "");
      setCity(partialData.city || "");
      setState(partialData.state || "");
      setZipCode(partialData.zip_code || "");
      setCountry(partialData.country || "US");
    }
  }, [partialData]);

  const handleSave = () => {
    if (!name.trim() || !relationshipType.trim()) {
      return;
    }

    const interestsArray = interests
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    const completeData: ExtractedData = {
      name: name.trim(),
      relationship_type: relationshipType.trim(),
      interests: interestsArray.length > 0 ? interestsArray : undefined,
      birthday: birthday.trim() || undefined,
      emotional_tone_preference: emotionalTone.trim() || undefined,
      gift_budget_min: budgetMin ? parseInt(budgetMin) : undefined,
      gift_budget_max: budgetMax ? parseInt(budgetMax) : undefined,
      address: address.trim() || undefined,
      address_line_2: addressLine2.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      zip_code: zipCode.trim() || undefined,
      country: country.trim() || "US",
    };

    onComplete(completeData);
  };

  const isValid = name.trim().length > 0 && relationshipType.trim().length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Manual Entry</Text>
        <Text style={styles.description}>
          {partialData
            ? "We couldn't extract all the information. Please complete the required fields."
            : "Enter the recipient information manually."}
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
              value={name}
              onChangeText={setName}
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
              value={relationshipType}
              onChangeText={setRelationshipType}
              placeholder="e.g., Sister, Friend, Colleague"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Birthday</Text>
            <TextInput
              style={styles.input}
              value={birthday}
              onChangeText={setBirthday}
              placeholder="YYYY-MM-DD or MM-DD"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Interests</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={interests}
              onChangeText={setInterests}
              placeholder="e.g., reading, hiking, coffee (comma-separated)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
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
              value={emotionalTone}
              onChangeText={setEmotionalTone}
              placeholder="e.g., warm, professional, playful"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Budget Min</Text>
              <TextInput
                style={styles.input}
                value={budgetMin}
                onChangeText={setBudgetMin}
                placeholder="$"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Budget Max</Text>
              <TextInput
                style={styles.input}
                value={budgetMax}
                onChangeText={setBudgetMax}
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
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main Street"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Address Line 2</Text>
            <TextInput
              style={styles.input}
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder="Apt, Suite, etc."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#999"
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
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
                value={zipCode}
                onChangeText={setZipCode}
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
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isValid}
        >
          <Text style={styles.saveButtonText}>Continue</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#231F20",
    marginBottom: 8,
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
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
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
