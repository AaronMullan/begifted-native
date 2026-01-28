import React, { useEffect, useState, useCallback } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Button, IconButton } from "react-native-paper";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { HEADER_HEIGHT } from "../../lib/constants";
import type { GiftSuggestion, Recipient } from "../../types/recipient";
import { useRecipientForm } from "../../hooks/use-recipient-form";
import { RecipientDetailsForm } from "../../components/recipients/RecipientDetailsForm";
import { GiftSuggestionsView } from "../../components/recipients/GiftSuggestionsView";
import { useToast } from "../../hooks/use-toast";

export default function RecipientEditPage() {
  const insets = useSafeAreaInsets();
  const headerSpacerHeight = Math.max(HEADER_HEIGHT, insets.top + 60);
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
  const [isGenerating, setIsGenerating] = useState(false);
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

  const fetchSuggestions = useCallback(
    async (recipientId: string, checkForNew: boolean = false) => {
      setLoadingSuggestions(true);
      try {
        const { data, error } = await supabase
          .from("gift_suggestions")
          .select("*")
          .eq("recipient_id", recipientId)
          .order("generated_at", { ascending: false });

        if (error) throw error;
        const newSuggestions = data || [];

        // Check if new suggestions appeared (for polling detection)
        if (checkForNew) {
          setSuggestions((prevSuggestions) => {
            // Compare by checking if there are more suggestions or newer timestamps
            if (newSuggestions.length > prevSuggestions.length) {
              // New suggestions detected, stop generating
              setIsGenerating(false);
            } else if (
              newSuggestions.length > 0 &&
              prevSuggestions.length > 0
            ) {
              // Check if the newest suggestion is newer than what we had
              const newestNew = new Date(newSuggestions[0].generated_at);
              const newestOld = new Date(prevSuggestions[0].generated_at);
              if (newestNew > newestOld) {
                setIsGenerating(false);
              }
            }
            return newSuggestions;
          });
        } else {
          setSuggestions(newSuggestions);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    },
    []
  );

  // Fetch gift suggestions when recipient changes
  useEffect(() => {
    if (recipient) {
      fetchSuggestions(recipient.id);
    }
  }, [recipient, fetchSuggestions]);

  // Polling logic for gift generation
  useEffect(() => {
    if (!isGenerating || !recipient) return;

    const POLL_INTERVAL = 10000; // 10 seconds
    const MAX_POLL_TIME = 300000; // 5 minutes
    const startTime = Date.now();

    const pollInterval = setInterval(async () => {
      // Check if we've exceeded max poll time
      if (Date.now() - startTime >= MAX_POLL_TIME) {
        console.log("Polling timeout reached, stopping generation tracking");
        setIsGenerating(false);
        clearInterval(pollInterval);
        return;
      }

      // Fetch suggestions to check for new ones (pass true to check for new suggestions)
      await fetchSuggestions(recipient.id, true);
    }, POLL_INTERVAL);

    // Cleanup on unmount or when isGenerating becomes false
    return () => {
      clearInterval(pollInterval);
    };
  }, [isGenerating, recipient?.id, fetchSuggestions]);

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

        // Start generation tracking
        setIsGenerating(true);

        fetch("https://be-gifted.vercel.app/api/generate-gifts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipientId: recipient.id }),
        }).catch((err) => {
          console.error("Failed to trigger gift generation:", err);
          setIsGenerating(false); // Stop tracking on error
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
        <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
        <View style={styles.loadingPlaceholder}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!recipient) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
        <View style={styles.loadingPlaceholder}>
          <Text>Recipient not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
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
            isGenerating={isGenerating}
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
  headerSpacer: {
    backgroundColor: "transparent",
  },
  loadingPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
