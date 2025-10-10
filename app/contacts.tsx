import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import RecipientForm from "../components/RecipientForm";
import RecipientCard from "../components/RecipientCard";
import { Recipient } from "../types/recipient";

export default function Contacts() {
  const [session, setSession] = useState<Session | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(
    null
  );

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchRecipients(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchRecipients(session.user.id);
      } else {
        setRecipients([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRecipients(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("recipients")
        .select(
          "id, name, relationship_type, interests, birthday, emotional_tone_preference, gift_budget_min, gift_budget_max, address, address_line_2, city, state, zip_code, country, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecipients(data || []);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      if (error instanceof Error) {
        Alert.alert("Error fetching recipients", error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
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
    setFormVisible(true);
  }

  function openEditForm(recipient: Recipient) {
    setEditingRecipient(recipient);
    setName(recipient.name);
    setRelationshipType(recipient.relationship_type);
    setInterests(recipient.interests ? recipient.interests.join(", ") : "");
    setBirthday(recipient.birthday || "");
    setEmotionalTone(recipient.emotional_tone_preference || "");
    setBudgetMin(recipient.gift_budget_min?.toString() || "");
    setBudgetMax(recipient.gift_budget_max?.toString() || "");
    setAddress(recipient.address || "");
    setAddressLine2(recipient.address_line_2 || "");
    setCity(recipient.city || "");
    setState(recipient.state || "");
    setZipCode(recipient.zip_code || "");
    setCountry(recipient.country || "US");
    setFormVisible(true);
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
    if (!session?.user) {
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
      setLoading(true);

      const interestsArray = interests
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      if (editingRecipient) {
        const { data, error } = await supabase
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
          .eq("user_id", session.user.id)
          .select()
          .single();

        if (error) throw error;

        setRecipients(
          recipients.map((r) => (r.id === editingRecipient.id ? data : r))
        );
        Alert.alert("Success", "Recipient updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("recipients")
          .insert([
            {
              user_id: session.user.id,
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
          ])
          .select()
          .single();

        if (error) throw error;

        setRecipients([data, ...recipients]);
        Alert.alert("Success", "Recipient added successfully!");
      }

      closeForm();
    } catch (error) {
      console.error("Error saving recipient:", error);
      if (error instanceof Error) {
        Alert.alert("Error saving recipient", error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecipient(id: string) {
    if (!session?.user) return;

    try {
      const { error } = await supabase
        .from("recipients")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setRecipients(recipients.filter((r) => r.id !== id));
      Alert.alert("Success", "Recipient deleted");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error deleting recipient", error.message);
      }
    }
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Contacts</Text>
          <Text style={styles.subtitle}>
            Please sign in to manage your gift recipients.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>My Contacts</Text>
        <Text style={styles.subtitle}>
          Manage the people you want to send gifts to.
        </Text>

        {!formVisible && (
          <TouchableOpacity style={styles.addButton} onPress={openAddForm}>
            <Text style={styles.addButtonText}>+ Add Recipient</Text>
          </TouchableOpacity>
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
            loading={loading}
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
          <Text style={styles.loadingText}>Loading...</Text>
        ) : recipients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recipients yet.</Text>
            <Text style={styles.emptySubtext}>
              Add your first recipient to get started!
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {recipients.map((recipient) => (
              <RecipientCard
                key={recipient.id}
                recipient={recipient}
                onEdit={openEditForm}
                onDelete={deleteRecipient}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#231F20",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    cursor: "pointer",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  list: {
    gap: 12,
  },
});
