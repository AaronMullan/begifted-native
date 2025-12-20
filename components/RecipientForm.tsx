import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { Recipient } from "../types/recipient";

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
    <View style={styles.form}>
      <Text variant="headlineSmall" style={styles.formTitle}>
        {editingRecipient ? "Edit Recipient" : "Add Recipient"}
      </Text>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Basic Information
      </Text>

      <TextInput
        mode="outlined"
        label="Name *"
        value={name}
        onChangeText={onNameChange}
        placeholder="e.g., Sarah Johnson"
        style={styles.input}
      />

      <TextInput
        mode="outlined"
        label="Relationship *"
        value={relationshipType}
        onChangeText={onRelationshipTypeChange}
        placeholder="e.g., Sister, Friend, Colleague"
        style={styles.input}
      />

      <TextInput
        mode="outlined"
        label="Birthday (optional)"
        value={birthday}
        onChangeText={onBirthdayChange}
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />

      <TextInput
        mode="outlined"
        label="Interests (optional)"
        value={interests}
        onChangeText={onInterestsChange}
        placeholder="e.g., reading, hiking, coffee (comma-separated)"
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Gift Preferences
      </Text>

      <TextInput
        mode="outlined"
        label="Emotional Tone (optional)"
        value={emotionalTone}
        onChangeText={onEmotionalToneChange}
        placeholder="e.g., heartfelt, playful, elegant"
        style={styles.input}
      />

      <Text variant="bodyMedium" style={styles.label}>
        Budget Range (optional)
      </Text>
      <View style={styles.budgetRow}>
        <View style={styles.budgetField}>
          <TextInput
            mode="outlined"
            label="Min ($)"
            value={budgetMin}
            onChangeText={onBudgetMinChange}
            placeholder="25"
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
        <View style={styles.budgetField}>
          <TextInput
            mode="outlined"
            label="Max ($)"
            value={budgetMax}
            onChangeText={onBudgetMaxChange}
            placeholder="100"
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Shipping Address (optional)
      </Text>

      <TextInput
        mode="outlined"
        label="Address Line 1"
        value={address}
        onChangeText={onAddressChange}
        placeholder="123 Main St"
        style={styles.input}
      />

      <TextInput
        mode="outlined"
        label="Address Line 2"
        value={addressLine2}
        onChangeText={onAddressLine2Change}
        placeholder="Apt 4B"
        style={styles.input}
      />

      <View style={styles.addressRow}>
        <View style={styles.cityField}>
          <TextInput
            mode="outlined"
            label="City"
            value={city}
            onChangeText={onCityChange}
            placeholder="New York"
            style={styles.input}
          />
        </View>
        <View style={styles.stateField}>
          <TextInput
            mode="outlined"
            label="State"
            value={state}
            onChangeText={onStateChange}
            placeholder="NY"
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.addressRow}>
        <View style={styles.zipField}>
          <TextInput
            mode="outlined"
            label="Zip Code"
            value={zipCode}
            onChangeText={onZipCodeChange}
            placeholder="10001"
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
        <View style={styles.countryField}>
          <TextInput
            mode="outlined"
            label="Country"
            value={country}
            onChangeText={onCountryChange}
            placeholder="US"
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formButtons}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={styles.cancelButton}
        >
          Cancel
        </Button>

        <Button
          mode="contained"
          onPress={onSave}
          disabled={loading}
          loading={loading}
          style={styles.submitButton}
        >
          {editingRecipient ? "Update" : "Add Recipient"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
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
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
