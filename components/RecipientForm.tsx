import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Recipient } from "../types/recipient";
import { PrimaryButton, SecondaryButton } from "./ui/buttons";

interface RecipientFormProps {
  editingRecipient: Recipient | null;
  name: string;
  relationshipType: string;
  interests: string;
  birthday: string;
  emotionalTone: string;
  budgetMin: string;
  budgetMax: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  loading: boolean;
  onNameChange: (value: string) => void;
  onRelationshipTypeChange: (value: string) => void;
  onInterestsChange: (value: string) => void;
  onBirthdayChange: (value: string) => void;
  onEmotionalToneChange: (value: string) => void;
  onBudgetMinChange: (value: string) => void;
  onBudgetMaxChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onAddressLine2Change: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onZipCodeChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function RecipientForm({
  editingRecipient,
  name,
  relationshipType,
  interests,
  birthday,
  emotionalTone,
  budgetMin,
  budgetMax,
  address,
  addressLine2,
  city,
  state,
  zipCode,
  country,
  loading,
  onNameChange,
  onRelationshipTypeChange,
  onInterestsChange,
  onBirthdayChange,
  onEmotionalToneChange,
  onBudgetMinChange,
  onBudgetMaxChange,
  onAddressChange,
  onAddressLine2Change,
  onCityChange,
  onStateChange,
  onZipCodeChange,
  onCountryChange,
  onSave,
  onCancel,
}: RecipientFormProps) {
  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.form}>
      <Text style={styles.formTitle}>
        {editingRecipient ? "Edit Recipient" : "Add Recipient"}
      </Text>

      <Text style={styles.sectionTitle}>Basic Information</Text>

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={onNameChange}
        placeholder="e.g., Sarah Johnson"
      />

      <Text style={styles.label}>Relationship *</Text>
      <TextInput
        style={styles.input}
        value={relationshipType}
        onChangeText={onRelationshipTypeChange}
        placeholder="e.g., Sister, Friend, Colleague"
      />

      <Text style={styles.label}>Birthday (optional)</Text>
      <TextInput
        style={styles.input}
        value={birthday}
        onChangeText={onBirthdayChange}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.label}>Interests (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={interests}
        onChangeText={onInterestsChange}
        placeholder="e.g., reading, hiking, coffee (comma-separated)"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.sectionTitle}>Gift Preferences</Text>

      <Text style={styles.label}>Emotional Tone (optional)</Text>
      <TextInput
        style={styles.input}
        value={emotionalTone}
        onChangeText={onEmotionalToneChange}
        placeholder="e.g., heartfelt, playful, elegant"
      />

      <Text style={styles.label}>Budget Range (optional)</Text>
      <View style={styles.budgetRow}>
        <View style={styles.budgetField}>
          <Text style={styles.sublabel}>Min ($)</Text>
          <TextInput
            style={styles.input}
            value={budgetMin}
            onChangeText={onBudgetMinChange}
            placeholder="25"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.budgetField}>
          <Text style={styles.sublabel}>Max ($)</Text>
          <TextInput
            style={styles.input}
            value={budgetMax}
            onChangeText={onBudgetMaxChange}
            placeholder="100"
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Shipping Address (optional)</Text>

      <Text style={styles.label}>Address Line 1</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={onAddressChange}
        placeholder="123 Main St"
      />

      <Text style={styles.label}>Address Line 2</Text>
      <TextInput
        style={styles.input}
        value={addressLine2}
        onChangeText={onAddressLine2Change}
        placeholder="Apt 4B"
      />

      <View style={styles.addressRow}>
        <View style={styles.cityField}>
          <Text style={styles.sublabel}>City</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={onCityChange}
            placeholder="New York"
          />
        </View>
        <View style={styles.stateField}>
          <Text style={styles.sublabel}>State</Text>
          <TextInput
            style={styles.input}
            value={state}
            onChangeText={onStateChange}
            placeholder="NY"
          />
        </View>
      </View>

      <View style={styles.addressRow}>
        <View style={styles.zipField}>
          <Text style={styles.sublabel}>Zip Code</Text>
          <TextInput
            style={styles.input}
            value={zipCode}
            onChangeText={onZipCodeChange}
            placeholder="10001"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.countryField}>
          <Text style={styles.sublabel}>Country</Text>
          <TextInput
            style={styles.input}
            value={country}
            onChangeText={onCountryChange}
            placeholder="US"
          />
        </View>
      </View>

      <View style={styles.formButtons}>
        <SecondaryButton
          title="Cancel"
          onPress={onCancel}
          style={styles.cancelButton}
        />

        <PrimaryButton
          title={
            loading
              ? "Saving..."
              : editingRecipient
              ? "Update"
              : "Add Recipient"
          }
          onPress={onSave}
          disabled={loading}
          loading={loading}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  form: {
    backgroundColor: "white",
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#231F20",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 12,
    color: "#231F20",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  sublabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "white",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  budgetRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  budgetField: {
    flex: 1,
  },
  addressRow: {
    flexDirection: "row",
    gap: 12,
  },
  cityField: {
    flex: 2,
  },
  stateField: {
    flex: 1,
  },
  zipField: {
    flex: 1,
  },
  countryField: {
    flex: 1,
  },
  formButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    cursor: "pointer",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#231F20",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
