import React, { useState } from "react";
import { StyleSheet, View, KeyboardAvoidingView, ScrollView, Keyboard, Platform, Pressable } from "react-native";
import { Text, TextInput, Button, Dialog, IconButton, Portal } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import type { Occasion } from "@/lib/api";
import { useRecipientOccasions, useDeleteOccasion, useUpdateOccasion } from "@/hooks/use-occasion-mutations";
import { OccasionEditor } from "@/components/recipients/conversation/OccasionEditor";

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
  recipientId: string;
  onDelete: () => void;
  onAddOccasion: () => void;
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
  recipientId,
  onDelete,
  onAddOccasion,
}) => {
  const { data: occasions = [] } = useRecipientOccasions(recipientId);
  const deleteOccasion = useDeleteOccasion();
  const updateOccasion = useUpdateOccasion();
  const [occasionToDelete, setOccasionToDelete] = useState<Occasion | null>(null);
  const [editingOccasion, setEditingOccasion] = useState<Occasion | null>(null);

  function formatOccasionType(type: string): string {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatOccasionDate(dateString: string): string {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function handleConfirmDeleteOccasion() {
    if (!occasionToDelete) return;
    deleteOccasion.mutate(
      { occasionId: occasionToDelete.id, recipientId },
      { onSettled: () => setOccasionToDelete(null) }
    );
  }

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
            {/* Occasions */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Occasions
            </Text>
            {occasions.map((occasion) => (
              <Pressable
                key={occasion.id}
                onPress={() => setEditingOccasion(occasion)}
              >
                <View style={styles.occasionRow}>
                  <MaterialIcons
                    name="event"
                    size={20}
                    color="#555"
                    style={styles.occasionIcon}
                  />
                  <View style={styles.occasionInfo}>
                    <Text variant="bodyLarge">
                      {formatOccasionType(occasion.occasion_type)}
                    </Text>
                    <Text variant="bodySmall" style={styles.occasionDate}>
                      {formatOccasionDate(occasion.date)}
                    </Text>
                  </View>
                  <IconButton
                    icon="close"
                    size={18}
                    onPress={() => setOccasionToDelete(occasion)}
                  />
                </View>
              </Pressable>
            ))}
            <Button
              mode="outlined"
              icon="plus"
              onPress={onAddOccasion}
              style={styles.addOccasionButton}
            >
              Add Occasion
            </Button>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Interests
      </Text>
      <TextInput
        mode="outlined"
        value={interests}
        onChangeText={onChangeInterests}
        placeholder="e.g., reading, hiking, coffee (comma-separated)"
        multiline
        style={[styles.input, styles.interestsInput]}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Gift Preferences
      </Text>

      <Text variant="bodyMedium" style={styles.label}>
        Emotional Tone
      </Text>
      <TextInput
        mode="outlined"
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
            value={budgetMin}
            onChangeText={onChangeBudgetMin}
            placeholder="Min ($)"
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
        <View style={styles.budgetField}>
          <TextInput
            mode="outlined"
            value={budgetMax}
            onChangeText={onChangeBudgetMax}
            placeholder="Max ($)"
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
      </View>

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Basic Information
            </Text>

      <Text variant="bodyMedium" style={styles.label}>
        Name *
      </Text>
      <TextInput
        mode="outlined"
        value={name}
        onChangeText={onChangeName}
        placeholder="e.g., Sarah Johnson"
        style={styles.input}
      />

      <Text variant="bodyMedium" style={styles.label}>
        Relationship *
      </Text>
      <TextInput
        mode="outlined"
        value={relationshipType}
        onChangeText={onChangeRelationshipType}
        placeholder="e.g., Sister, Friend, Colleague"
        style={styles.input}
      />

      <Text variant="bodyMedium" style={styles.label}>
        Birthday
      </Text>
      <TextInput
        mode="outlined"
        value={birthday}
        onChangeText={onChangeBirthday}
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Shipping Address
      </Text>

      <Text variant="bodyMedium" style={styles.label}>
        Address Line 1
      </Text>
      <TextInput
        mode="outlined"
        value={address}
        onChangeText={onChangeAddress}
        placeholder="123 Main St"
        style={styles.input}
      />

      <Text variant="bodyMedium" style={styles.label}>
        Address Line 2
      </Text>
      <TextInput
        mode="outlined"
        value={addressLine2}
        onChangeText={onChangeAddressLine2}
        placeholder="Apt 4B"
        style={styles.input}
      />

      <View style={styles.addressRow}>
        <View style={styles.cityField}>
          <Text variant="bodyMedium" style={styles.label}>
            City
          </Text>
          <TextInput
            mode="outlined"
            value={city}
            onChangeText={onChangeCity}
            placeholder="New York"
            style={styles.input}
          />
        </View>
        <View style={styles.stateField}>
          <Text variant="bodyMedium" style={styles.label}>
            State
          </Text>
          <TextInput
            mode="outlined"
            value={state}
            onChangeText={onChangeState}
            placeholder="NY"
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.addressRow}>
        <View style={styles.zipField}>
          <Text variant="bodyMedium" style={styles.label}>
            Zip Code
          </Text>
          <TextInput
            mode="outlined"
            value={zipCode}
            onChangeText={onChangeZipCode}
            placeholder="10001"
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
        <View style={styles.countryField}>
          <Text variant="bodyMedium" style={styles.label}>
            Country
          </Text>
          <TextInput
            mode="outlined"
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
              textColor="#cc0000"
              icon="delete-outline"
              onPress={onDelete}
              style={styles.deleteButton}
            >
              Delete Recipient
            </Button>
          </View>
        </ScrollView>
      </Pressable>
      <Portal>
        <Dialog
          visible={!!occasionToDelete}
          onDismiss={() => setOccasionToDelete(null)}
          style={styles.dialog}
        >
          <Dialog.Title>
            <Text variant="bodySmall" style={styles.dialogLabel}>Delete Occasion</Text>
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="headlineSmall">
              Delete{" "}
              {occasionToDelete
                ? formatOccasionType(occasionToDelete.occasion_type)
                : ""}
              ?
            </Text>
          </Dialog.Content>
          <View style={styles.dialogActions}>
            <Button mode="outlined" onPress={() => setOccasionToDelete(null)} style={styles.dialogButton}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor="#cc0000"
              textColor="#fff"
              onPress={handleConfirmDeleteOccasion}
              loading={deleteOccasion.isPending}
              style={styles.dialogButton}
            >
              Delete
            </Button>
          </View>
        </Dialog>
      </Portal>
      {editingOccasion && (
        <OccasionEditor
          occasion={editingOccasion}
          visible={!!editingOccasion}
          onClose={() => setEditingOccasion(null)}
          onSave={(date) => {
            updateOccasion.mutate({
              occasionId: editingOccasion.id,
              recipientId,
              fields: { date },
            });
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
  },
  label: {
    marginBottom: 4,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  interestsInput: {
    minHeight: 80,
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
  dialog: {
    borderRadius: 16,
  },
  dialogLabel: {
    color: "#595959",
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
  },
  dialogButton: {
    minWidth: 100,
  },
  occasionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingLeft: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  occasionIcon: {
    marginRight: 10,
  },
  occasionInfo: {
    flex: 1,
  },
  occasionDate: {
    color: "#888",
  },
  addOccasionButton: {
    marginBottom: 8,
  },
  deleteButton: {
    marginTop: 32,
    marginBottom: 40,
  },
});
