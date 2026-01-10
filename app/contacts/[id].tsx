import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Text, Button, IconButton } from "react-native-paper";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import type { GiftSuggestion, Recipient } from "../../types/recipient";
import { useRecipientForm } from "../../hooks/use-recipient-form";
import { RecipientDetailsForm } from "../../components/recipients/RecipientDetailsForm";
import { GiftSuggestionsView } from "../../components/recipients/GiftSuggestionsView";
import { useToast } from "../../hooks/use-toast";

export default function RecipientEditPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const recipientId = params.id;
  const initialTab = (params.tab as "details" | "gifts") || "gifts";

  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<GiftSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "gifts">(initialTab);
  const { showToast, toast } = useToast();

  // Fetch recipient data
  useEffect(() => {
    if (!recipientId) return;

    const fetchRecipient = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/");
          return;
        }

        const { data, error } = await supabase
          .from("recipients")
          .select("*")
          .eq("id", recipientId)
          .eq("user_id", session.user.id)
          .single();

        if (error) throw error;
        setRecipient(data);
      } catch (error) {
        console.error("Error fetching recipient:", error);
        Alert.alert("Error", "Failed to load recipient");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchRecipient();
  }, [recipientId, router]);

  // Form state management
  const {
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
    setName,
    setRelationshipType,
    setInterests,
    setBirthday,
    setEmotionalTone,
    setBudgetMin,
    setBudgetMax,
    setAddress,
    setAddressLine2,
    setCity,
    setState,
    setZipCode,
    setCountry,
    hasChanges,
    createChangeHandler,
    resetChanges,
    getFormData,
    hasGiftRelevantChanges,
  } = useRecipientForm(recipient);

  // Reset active tab when tab param changes
  useEffect(() => {
    if (params.tab) {
      setActiveTab(params.tab as "details" | "gifts");
    }
  }, [params.tab]);

  // Fetch gift suggestions when recipient changes
  useEffect(() => {
    if (recipient) {
      fetchSuggestions(recipient.id);
    }
  }, [recipient]);

  const fetchSuggestions = async (recipientId: string) => {
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase
        .from("gift_suggestions")
        .select("*")
        .eq("recipient_id", recipientId)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSave = async () => {
    if (!recipient || !name.trim() || !relationshipType.trim()) {
      return;
    }

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/");
        return;
      }

      const formData = getFormData();
      const giftRelevantChanged = hasGiftRelevantChanges();

      const { error } = await supabase
        .from("recipients")
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipient.id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      // Update local recipient state
      setRecipient((prev) => (prev ? { ...prev, ...formData } : null));

      // If gift-relevant fields changed, trigger new gift generation
      if (giftRelevantChanged) {
        console.log("Triggering gift generation for:", recipient.id);

        fetch("https://be-gifted.vercel.app/api/generate-gifts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipientId: recipient.id }),
        }).catch((err) => {
          console.error("Failed to trigger gift generation:", err);
        });

        // Show toast notification
        const message = `${name}'s profile has been updated. New gift suggestions are being generated and will appear shortly.`;
        showToast(message);
      } else {
        console.log("No gift-relevant changes detected");
        // Show toast for any save, even without gift-relevant changes
        showToast(`${name}'s profile has been updated.`);
      }
      resetChanges(); // Reset after successful save
    } catch (error) {
      console.error("Error saving recipient:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recipient) return;

    Alert.alert(
      "Delete Recipient",
      `Are you sure you want to delete ${recipient.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (!session?.user) return;

              const { error } = await supabase
                .from("recipients")
                .delete()
                .eq("id", recipient.id)
                .eq("user_id", session.user.id);

              if (error) throw error;

              router.back();
            } catch (error) {
              console.error("Error deleting recipient:", error);
              Alert.alert("Error", "Failed to delete recipient");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!recipient) {
    return (
      <View style={styles.container}>
        <Text>Recipient not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
          iconColor="#000000"
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          {recipient.name}
        </Text>
        {activeTab !== "gifts" && (
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={
              saving || !name.trim() || !relationshipType.trim() || !hasChanges
            }
            loading={saving}
            style={styles.saveButton}
            compact
          >
            Save
          </Button>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Button
          mode={activeTab === "gifts" ? "contained" : "text"}
          onPress={() => setActiveTab("gifts")}
          icon="gift-outline"
          style={styles.tab}
          compact
        >
          Gift Ideas
          {suggestions.length > 0 && ` (${suggestions.length})`}
        </Button>
        <Button
          mode={activeTab === "details" ? "contained" : "text"}
          onPress={() => setActiveTab("details")}
          icon="account-outline"
          style={styles.tab}
          compact
        >
          Details
        </Button>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === "details" ? (
          <RecipientDetailsForm
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
            onChangeName={createChangeHandler(setName)}
            onChangeRelationshipType={createChangeHandler(setRelationshipType)}
            onChangeInterests={createChangeHandler(setInterests)}
            onChangeBirthday={createChangeHandler(setBirthday)}
            onChangeEmotionalTone={createChangeHandler(setEmotionalTone)}
            onChangeBudgetMin={createChangeHandler(setBudgetMin)}
            onChangeBudgetMax={createChangeHandler(setBudgetMax)}
            onChangeAddress={createChangeHandler(setAddress)}
            onChangeAddressLine2={createChangeHandler(setAddressLine2)}
            onChangeCity={createChangeHandler(setCity)}
            onChangeState={createChangeHandler(setState)}
            onChangeZipCode={createChangeHandler(setZipCode)}
            onChangeCountry={createChangeHandler(setCountry)}
            onDelete={handleDelete}
          />
        ) : (
          <GiftSuggestionsView
            suggestions={suggestions}
            loading={loadingSuggestions}
            recipientName={recipient.name}
          />
        )}
      </ScrollView>
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  saveButton: {
    marginLeft: 8,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
