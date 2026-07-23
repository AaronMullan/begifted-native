import { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
} from "react-native";
import { Text, TextInput, HelperText } from "react-native-paper";
import { Colors } from "@/lib/colors";
import { ExtractedData } from "@/hooks/use-add-recipient-flow";
import { DualActionFooter } from "./DualActionFooter";
import { isInvalidBirthdayInput } from "@/utils/birthday";
import { Spacing } from "@/lib/spacing";
import { KEYBOARD_CTA_GAP } from "@/lib/constants";

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
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [address, setAddress] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("US");

  // Pre-populate with partial data when it changes. Done during render (not in
  // an effect) via a stored previous value, the documented alternative to a
  // setState-in-effect sync.
  const [prevPartialData, setPrevPartialData] = useState(partialData);
  if (partialData !== prevPartialData) {
    setPrevPartialData(partialData);
    if (partialData) {
      setName(partialData.name || "");
      setRelationshipType(partialData.relationship_type || "");
      setInterests(
        partialData.interests ? partialData.interests.join(", ") : ""
      );
      setBirthday(partialData.birthday || "");
      setBudgetMin(partialData.gift_budget_min?.toString() || "");
      setBudgetMax(partialData.gift_budget_max?.toString() || "");
      setAddress(partialData.address || "");
      setAddressLine2(partialData.address_line_2 || "");
      setCity(partialData.city || "");
      setState(partialData.state || "");
      setZipCode(partialData.zip_code || "");
      setCountry(partialData.country || "US");
    }
  }

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={KEYBOARD_CTA_GAP}
    >
      <Pressable style={styles.container} onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="headlineSmall" style={styles.title}>
            Manual Entry
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            {partialData
              ? "We couldn't extract all the information. Please complete the required fields."
              : "Enter the recipient information manually."}
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
                value={name}
                onChangeText={setName}
                placeholder="Enter name"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="Relationship *"
                value={relationshipType}
                onChangeText={setRelationshipType}
                placeholder="e.g., Sister, Friend, Colleague"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="Birthday"
                value={birthday}
                onChangeText={setBirthday}
                placeholder="MM-DD-YYYY or MM-DD"
                error={isInvalidBirthdayInput(birthday)}
                style={styles.input}
              />
              {isInvalidBirthdayInput(birthday) && (
                <HelperText type="error" visible>
                  Use MM-DD-YYYY (e.g. 12-07-1990) or MM-DD (e.g. 12-07) if the
                  year is unknown.
                </HelperText>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="Interests"
                value={interests}
                onChangeText={setInterests}
                placeholder="e.g., reading, hiking, coffee (comma-separated)"
                multiline
                numberOfLines={3}
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
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                  placeholder="$"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <TextInput
                  mode="outlined"
                  label="Budget Max"
                  value={budgetMax}
                  onChangeText={setBudgetMax}
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
                value={address}
                onChangeText={setAddress}
                placeholder="123 Main Street"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="Address Line 2"
                value={addressLine2}
                onChangeText={setAddressLine2}
                placeholder="Apt, Suite, etc."
                style={styles.input}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <TextInput
                  mode="outlined"
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  style={styles.input}
                />
              </View>

              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <TextInput
                  mode="outlined"
                  label="State"
                  value={state}
                  onChangeText={setState}
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
                  value={zipCode}
                  onChangeText={setZipCode}
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
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Country"
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <DualActionFooter
          secondaryLabel="Cancel"
          onSecondary={onCancel}
          onPrimary={handleSave}
          primaryDisabled={!isValid}
        />
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
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
  title: {
    marginBottom: 8,
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
    marginBottom: Spacing.fieldGap,
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
