import React, { useState } from "react";
import { StyleSheet, View, KeyboardAvoidingView, ScrollView, Keyboard, Platform, Pressable } from "react-native";
import { Text, Button, Dialog, IconButton, Portal } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import type { Occasion } from "@/lib/api";
import { useRecipientOccasions, useDeleteOccasion, useUpdateOccasion } from "@/hooks/use-occasion-mutations";
import { OccasionEditor } from "@/components/recipients/conversation/OccasionEditor";
import { RecipientFields } from "@/components/recipients/RecipientFields";

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
