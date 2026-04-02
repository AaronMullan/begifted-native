import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Text, Button } from "react-native-paper";
import { Colors } from "../../../lib/colors";
import ContactFileImport from "../../../components/ContactFileImport";
import ContactPicker from "../../../components/ContactPicker";
import ContactsAccessIntro from "../../../components/ContactsAccessIntro";
import RecipientCard from "../../../components/RecipientCard";
import RecipientForm from "../../../components/RecipientForm";
import {
  DeviceContact,
  useDeviceContacts,
} from "../../../hooks/use-device-contacts";
import { useToast } from "../../../hooks/use-toast";
import { useAuth } from "../../../hooks/use-auth";
import { useRecipients } from "../../../hooks/use-recipients";
import { queryKeys } from "../../../lib/query-keys";
import { supabase } from "../../../lib/supabase";
import { Recipient } from "../../../types/recipient";
import { BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { useBottomNavScrollVisibility } from "../../../hooks/use-bottom-nav-scroll-visibility";

export default function Contacts() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: recipients = [], isLoading: loading } = useRecipients();
  const [formVisible, setFormVisible] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  // Form state
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
  const [pickerVisible, setPickerVisible] = useState(false);
  const [contactsAccessIntroVisible, setContactsAccessIntroVisible] =
    useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const { loading: contactsLoading, getDeviceContacts } = useDeviceContacts();
  const { toast } = useToast();
  const { handleScroll } = useBottomNavScrollVisibility();

  function openEditForm(recipient: Recipient) {
    router.push(`/contacts/${recipient.id}?tab=gifts`);
  }

  function closeForm() {
    setFormVisible(false);
    setEditingRecipient(null);
    setName("");
    setRelationshipType("");
    setInterests("");
    setBirthday("");
    setEmotionalTone("");
    setBudgetMin("");
    setBudgetMax("");
    setAddress("");
    setAddressLine2("");
    setCity("");
    setState("");
    setZipCode("");
    setCountry("US");
  }

  async function saveRecipient() {
    if (!user) {
      Alert.alert("Error", "You must be logged in to manage recipients");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    if (!relationshipType.trim()) {
      Alert.alert("Error", "Relationship is required");
      return;
    }

    try {
      setSaving(true);

      const interestsArray = interests
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      if (editingRecipient) {
        const { error } = await supabase
          .from("recipients")
          .update({
            name: name.trim(),
            relationship_type: relationshipType.trim(),
            interests: interestsArray.length > 0 ? interestsArray : null,
            birthday: birthday.trim() || null,
            emotional_tone_preference: emotionalTone.trim() || null,
            gift_budget_min: budgetMin ? parseInt(budgetMin) : null,
            gift_budget_max: budgetMax ? parseInt(budgetMax) : null,
            address: address.trim() || null,
            address_line_2: addressLine2.trim() || null,
            city: city.trim() || null,
            state: state.trim() || null,
            zip_code: zipCode.trim() || null,
            country: country.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingRecipient.id)
          .eq("user_id", user.id);

        if (error) throw error;

        await queryClient.invalidateQueries({
          queryKey: queryKeys.recipients(user.id),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.occasions(user.id),
        });
        Alert.alert("Success", "Recipient updated successfully!");
      } else {
        const { error } = await supabase.from("recipients").insert([
          {
            user_id: user.id,
            name: name.trim(),
            relationship_type: relationshipType.trim(),
            interests: interestsArray.length > 0 ? interestsArray : null,
            birthday: birthday.trim() || null,
            emotional_tone_preference: emotionalTone.trim() || null,
            gift_budget_min: budgetMin ? parseInt(budgetMin) : null,
            gift_budget_max: budgetMax ? parseInt(budgetMax) : null,
            address: address.trim() || null,
            address_line_2: addressLine2.trim() || null,
            city: city.trim() || null,
            state: state.trim() || null,
            zip_code: zipCode.trim() || null,
            country: country.trim() || null,
          },
        ]);

        if (error) throw error;

        await queryClient.invalidateQueries({
          queryKey: queryKeys.recipients(user.id),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.occasions(user.id),
        });
        Alert.alert("Success", "Recipient added successfully!");
      }

      closeForm();
    } catch (error) {
      console.error("Error saving recipient:", error);
      if (error instanceof Error) {
        Alert.alert("Error saving recipient", error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  function openContactsAccessIntro() {
    setContactsAccessIntroVisible(true);
  }

  async function handleContinueContactsAccess() {
    setContactsAccessIntroVisible(false);
    const contacts = await getDeviceContacts();
    setDeviceContacts(contacts);
    if (contacts.length > 0) {
      setPickerVisible(true);
    }
  }

  function handleImportFromFile(contacts: DeviceContact[]) {
    setDeviceContacts(contacts);
    if (contacts.length > 0) {
      setPickerVisible(true);
    }
  }

  function handleSelectContact(contact: DeviceContact) {
    setPickerVisible(false);
    router.push({
      pathname: "/contacts/add",
      params: { name: contact.name },
    });
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Contacts
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Please sign in to manage your gift recipients.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerSpacer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Header section */}
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              My Contacts
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Manage the people you want to send gifts to.
            </Text>
          </View>

          {!formVisible && (
            <>
              <Button
                mode="contained"
                onPress={() => router.push("/contacts/add")}
                style={styles.addButton}
                icon="plus"
              >
                Add Recipient
              </Button>

              {Platform.OS === "web" ? (
                <ContactFileImport onImport={handleImportFromFile} />
              ) : (
                <Button
                  mode="outlined"
                  onPress={openContactsAccessIntro}
                  disabled={contactsLoading}
                  loading={contactsLoading}
                  style={styles.importButton}
                  icon="phone"
                >
                  Import from Device Contacts
                </Button>
              )}
            </>
          )}

          {formVisible && (
            <RecipientForm
              editingRecipient={editingRecipient}
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
              loading={loading || saving}
              onNameChange={setName}
              onRelationshipTypeChange={setRelationshipType}
              onInterestsChange={setInterests}
              onBirthdayChange={setBirthday}
              onEmotionalToneChange={setEmotionalTone}
              onBudgetMinChange={setBudgetMin}
              onBudgetMaxChange={setBudgetMax}
              onAddressChange={setAddress}
              onAddressLine2Change={setAddressLine2}
              onCityChange={setCity}
              onStateChange={setState}
              onZipCodeChange={setZipCode}
              onCountryChange={setCountry}
              onSave={saveRecipient}
              onCancel={closeForm}
            />
          )}

          {loading && recipients.length === 0 ? (
            <Text variant="bodyLarge" style={styles.loadingText}>
              Loading...
            </Text>
          ) : recipients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="titleLarge" style={styles.emptyText}>
                No recipients yet.
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Add your first recipient to get started!
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {recipients.map((recipient) => (
                <RecipientCard
                  key={recipient.id}
                  recipient={recipient}
                  onPress={openEditForm}
                />
              ))}
            </View>
          )}
        </View>
        <ContactsAccessIntro
          visible={contactsAccessIntroVisible}
          onContinue={handleContinueContactsAccess}
          onClose={() => setContactsAccessIntroVisible(false)}
          isLoading={contactsLoading}
        />
        <ContactPicker
          visible={pickerVisible}
          contacts={deviceContacts}
          onSelect={handleSelectContact}
          onClose={() => setPickerVisible(false)}
        />
      </ScrollView>
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerSpacer: {
    height: 0,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  scrollContent: {
    paddingBottom: BOTTOM_NAV_HEIGHT,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    marginBottom: 8,
    color: Colors.darks.black,
  },
  subtitle: {
    color: Colors.darks.black,
    opacity: 0.9,
  },
  addButton: {
    marginBottom: 20,
  },
  loadingText: {
    textAlign: "center",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  list: {
    gap: 24,
  },
  emptyText: {
    marginBottom: 8,
    color: Colors.darks.black,
  },
  emptySubtext: {
    color: Colors.darks.black,
    opacity: 0.8,
  },
  importButton: {
    marginBottom: 20,
  },
});
