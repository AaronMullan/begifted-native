import { View, StyleSheet, KeyboardAvoidingView, ScrollView, Keyboard, Platform, Pressable } from "react-native";
import { Text, Button } from "react-native-paper";
import { Recipient } from "../types/recipient";
import { RecipientFields } from "./recipients/RecipientFields";

type RecipientFormProps = {
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
  onSave: () => void;
  onCancel: () => void;
};

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
  onSave,
  onCancel,
}: RecipientFormProps) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <Text variant="headlineSmall" style={styles.formTitle}>
              {editingRecipient ? "Edit Recipient" : "Add Recipient"}
            </Text>

            <RecipientFields
              name={name}
              relationshipType={relationshipType}
              interests={interests}
              birthday={birthday}
              emotionalTone={emotionalTone}
              budgetMin={budgetMin}
              budgetMax={budgetMax}
              address={address}
              addressLine2={addressLine2}
              city={city}
              state={state}
              zipCode={zipCode}
              country={country}
              onChangeName={onChangeName}
              onChangeRelationshipType={onChangeRelationshipType}
              onChangeInterests={onChangeInterests}
              onChangeBirthday={onChangeBirthday}
              onChangeEmotionalTone={onChangeEmotionalTone}
              onChangeBudgetMin={onChangeBudgetMin}
              onChangeBudgetMax={onChangeBudgetMax}
              onChangeAddress={onChangeAddress}
              onChangeAddressLine2={onChangeAddressLine2}
              onChangeCity={onChangeCity}
              onChangeState={onChangeState}
              onChangeZipCode={onChangeZipCode}
              onChangeCountry={onChangeCountry}
            />

            <View style={styles.formButtons}>
              <Button mode="outlined" onPress={onCancel} style={styles.cancelButton}>
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
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
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
