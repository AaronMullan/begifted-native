import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";

type RecipientDetailsFormProps = {
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
  onChangeName: (value: string) => void;
  onChangeRelationshipType: (value: string) => void;
  onChangeInterests: (value: string) => void;
  onChangeBirthday: (value: string) => void;
  onChangeEmotionalTone: (value: string) => void;
  onChangeBudgetMin: (value: string) => void;
  onChangeBudgetMax: (value: string) => void;
  onChangeAddress: (value: string) => void;
  onChangeAddressLine2: (value: string) => void;
  onChangeCity: (value: string) => void;
  onChangeState: (value: string) => void;
  onChangeZipCode: (value: string) => void;
  onChangeCountry: (value: string) => void;
  onDelete: () => void;
};

export const RecipientDetailsForm: React.FC<RecipientDetailsFormProps> = ({
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
  onChangeName,
  onChangeRelationshipType,
  onChangeInterests,
  onChangeBirthday,
  onChangeEmotionalTone,
  onChangeBudgetMin,
  onChangeBudgetMax,
  onChangeAddress,
  onChangeAddressLine2,
  onChangeCity,
  onChangeState,
  onChangeZipCode,
  onChangeCountry,
  onDelete,
}) => {
  return (
    <View style={styles.form}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Basic Information
      </Text>

      <TextInput
        mode="outlined"
        label="Name *"
        value={name}
        onChangeText={onChangeName}
        placeholder="e.g., Sarah Johnson"
        style={styles.input}
      />

      <TextInput
        mode="outlined"
        label="Relationship *"
        value={relationshipType}
        onChangeText={onChangeRelationshipType}
        placeholder="e.g., Sister, Friend, Colleague"
        style={styles.input}
      />

      <TextInput
        mode="outlined"
        label="Birthday"
        value={birthday}
        onChangeText={onChangeBirthday}
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />

      <TextInput
        mode="outlined"
        label="Interests"
        value={interests}
        onChangeText={onChangeInterests}
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
        label="Emotional Tone"
        value={emotionalTone}
        onChangeText={onChangeEmotionalTone}
        placeholder="e.g., heartfelt, playful, elegant"
        style={styles.input}
      />

      <Text variant="bodyMedium" style={styles.label}>
        Budget Range
      </Text>
      <View style={styles.budgetRow}>
        <View style={styles.budgetField}>
          <TextInput
            mode="outlined"
            label="Min ($)"
            value={budgetMin}
            onChangeText={onChangeBudgetMin}
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
            onChangeText={onChangeBudgetMax}
            placeholder="100"
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Shipping Address
      </Text>

      <TextInput
        mode="outlined"
        label="Address Line 1"
        value={address}
        onChangeText={onChangeAddress}
        placeholder="123 Main St"
        style={styles.input}
      />

      <TextInput
        mode="outlined"
        label="Address Line 2"
        value={addressLine2}
        onChangeText={onChangeAddressLine2}
        placeholder="Apt 4B"
        style={styles.input}
      />

      <View style={styles.addressRow}>
        <View style={styles.cityField}>
          <TextInput
            mode="outlined"
            label="City"
            value={city}
            onChangeText={onChangeCity}
            placeholder="New York"
            style={styles.input}
          />
        </View>
        <View style={styles.stateField}>
          <TextInput
            mode="outlined"
            label="State"
            value={state}
            onChangeText={onChangeState}
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
            onChangeText={onChangeZipCode}
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
            onChangeText={onChangeCountry}
            placeholder="US"
            style={styles.input}
          />
        </View>
      </View>

      {/* Delete Button */}
      <Button
        mode="outlined"
        buttonColor="#000000"
        textColor="#000000"
        icon="delete-outline"
        onPress={onDelete}
        style={styles.deleteButton}
      >
        Delete Recipient
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    padding: 16,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    marginBottom: 16,
  },
  budgetRow: {
    flexDirection: "row",
    gap: 12,
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
  deleteButton: {
    marginTop: 32,
    marginBottom: 40,
  },
});
