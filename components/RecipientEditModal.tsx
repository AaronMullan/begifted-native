import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Text,
  TextInput,
  Button,
  IconButton,
  Card,
  Divider,
} from "react-native-paper";
import { supabase } from "../lib/supabase";
import type { GiftSuggestion, Recipient } from "../types/recipient";

type RecipientEditModalProps = {
  visible: boolean;
  recipient: Recipient | null;
  onClose: () => void;
  onSave: (updatedRecipient: Partial<Recipient>) => Promise<void>;
  onDelete: (id: string) => void;
  initialTab?: "details" | "gifts";
};

export const RecipientEditModal: React.FC<RecipientEditModalProps> = ({
  visible,
  recipient,
  onClose,
  onSave,
  onDelete,
  initialTab = "gifts",
}) => {
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

  // UI state
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<GiftSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "gifts">(initialTab);

  // Reset active tab when modal is opened for a recipient
  useEffect(() => {
    if (visible && recipient) {
      setActiveTab(initialTab);
    }
  }, [visible, recipient?.id, initialTab]);

  // Populate form when recipient changes
  useEffect(() => {
    if (recipient) {
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

      // Fetch gift suggestions
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

  // Store original values when modal opens (before any edits)
  const [originalValues, setOriginalValues] = useState<{
    relationship_type: string;
    interests: string;
    emotional_tone_preference: string;
    gift_budget_min?: number;
    gift_budget_max?: number;
  } | null>(null);

  // Capture original values when recipient changes
  useEffect(() => {
    if (recipient) {
      setOriginalValues({
        relationship_type: recipient.relationship_type,
        interests: recipient.interests?.join(", ") || "",
        emotional_tone_preference: recipient.emotional_tone_preference || "",
        gift_budget_min: recipient.gift_budget_min,
        gift_budget_max: recipient.gift_budget_max,
      });
    }
  }, [recipient?.id]); // Only update when recipient ID changes, not on every re-render

  const handleSave = async () => {
    if (!recipient || !name.trim() || !relationshipType.trim()) {
      return;
    }

    setSaving(true);
    try {
      const interestsArray = interests
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const newInterests = interestsArray.join(", ");
      const newBudgetMin = budgetMin ? parseInt(budgetMin) : undefined;
      const newBudgetMax = budgetMax ? parseInt(budgetMax) : undefined;

      // Check if gift-relevant fields have changed from original
      const hasGiftRelevantChanges = originalValues
        ? relationshipType.trim() !== originalValues.relationship_type ||
          newInterests !== originalValues.interests ||
          emotionalTone.trim() !== originalValues.emotional_tone_preference ||
          newBudgetMin !== originalValues.gift_budget_min ||
          newBudgetMax !== originalValues.gift_budget_max
        : false;

      console.log("Save check:", {
        hasGiftRelevantChanges,
        newInterests,
        originalInterests: originalValues?.interests,
        relationshipChanged:
          relationshipType.trim() !== originalValues?.relationship_type,
        interestsChanged: newInterests !== originalValues?.interests,
      });

      await onSave({
        name: name.trim(),
        relationship_type: relationshipType.trim(),
        interests: interestsArray.length > 0 ? interestsArray : undefined,
        birthday: birthday.trim() || undefined,
        emotional_tone_preference: emotionalTone.trim() || undefined,
        gift_budget_min: newBudgetMin,
        gift_budget_max: newBudgetMax,
        address: address.trim() || undefined,
        address_line_2: addressLine2.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip_code: zipCode.trim() || undefined,
        country: country.trim() || undefined,
      });

      // If gift-relevant fields changed, trigger new gift generation
      if (hasGiftRelevantChanges) {
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

        // Show alert - use window.alert on web for reliability
        const message = `${name}'s profile has been updated. New gift suggestions are being generated and will appear shortly.`;
        if (typeof window !== "undefined" && window.alert) {
          window.alert(message);
        } else {
          Alert.alert("Saved!", message);
        }
        onClose();
      } else {
        console.log("No gift-relevant changes detected, closing modal");
        onClose();
      }
    } catch (error) {
      console.error("Error saving recipient:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (recipient) {
      onDelete(recipient.id);
      onClose();
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return "Price not available";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const openLink = (link?: string) => {
    if (link) {
      Linking.openURL(link);
    }
  };

  if (!recipient) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={24}
            onPress={onClose}
            iconColor="#000000"
          />
          <Text variant="titleLarge" style={styles.headerTitle}>
            {recipient.name}
          </Text>
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={saving || !name.trim() || !relationshipType.trim()}
            loading={saving}
            style={styles.saveButton}
            compact
          >
            Save
          </Button>
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
            /* Details Tab */
            <View style={styles.form}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Basic Information
              </Text>

              <TextInput
                mode="outlined"
                label="Name *"
                value={name}
                onChangeText={setName}
                placeholder="e.g., Sarah Johnson"
                style={styles.input}
              />

              <TextInput
                mode="outlined"
                label="Relationship *"
                value={relationshipType}
                onChangeText={setRelationshipType}
                placeholder="e.g., Sister, Friend, Colleague"
                style={styles.input}
              />

              <TextInput
                mode="outlined"
                label="Birthday"
                value={birthday}
                onChangeText={setBirthday}
                placeholder="YYYY-MM-DD"
                style={styles.input}
              />

              <TextInput
                mode="outlined"
                label="Interests"
                value={interests}
                onChangeText={setInterests}
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
                onChangeText={setEmotionalTone}
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
                    onChangeText={setBudgetMin}
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
                    onChangeText={setBudgetMax}
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
                onChangeText={setAddress}
                placeholder="123 Main St"
                style={styles.input}
              />

              <TextInput
                mode="outlined"
                label="Address Line 2"
                value={addressLine2}
                onChangeText={setAddressLine2}
                placeholder="Apt 4B"
                style={styles.input}
              />

              <View style={styles.addressRow}>
                <View style={styles.cityField}>
                  <TextInput
                    mode="outlined"
                    label="City"
                    value={city}
                    onChangeText={setCity}
                    placeholder="New York"
                    style={styles.input}
                  />
                </View>
                <View style={styles.stateField}>
                  <TextInput
                    mode="outlined"
                    label="State"
                    value={state}
                    onChangeText={setState}
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
                    onChangeText={setZipCode}
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
                    onChangeText={setCountry}
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
                onPress={handleDelete}
                style={styles.deleteButton}
              >
                Delete Recipient
              </Button>
            </View>
          ) : (
            /* Gifts Tab */
            <View style={styles.giftsContainer}>
              {loadingSuggestions ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" />
                  <Text variant="bodyMedium" style={styles.loadingText}>
                    Loading gift suggestions...
                  </Text>
                </View>
              ) : suggestions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="gift-outline" size={64} color="#ccc" />
                  <Text variant="titleLarge" style={styles.emptyTitle}>
                    No Gift Ideas Yet
                  </Text>
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    Gift suggestions will appear here once they're generated for{" "}
                    {recipient.name}.
                  </Text>
                </View>
              ) : (
                <View style={styles.suggestionsList}>
                  {suggestions.map((suggestion) => (
                    <Card
                      key={suggestion.id}
                      style={styles.suggestionCard}
                      onPress={() => openLink(suggestion.link)}
                      disabled={!suggestion.link}
                    >
                      {suggestion.image_url && (
                        <Card.Cover
                          source={{ uri: suggestion.image_url }}
                          style={styles.suggestionImage}
                        />
                      )}
                      <Card.Content>
                        <Text
                          variant="titleMedium"
                          style={styles.suggestionTitle}
                        >
                          {suggestion.title}
                        </Text>
                        {suggestion.description && (
                          <Text
                            variant="bodyMedium"
                            style={styles.suggestionDescription}
                            numberOfLines={2}
                          >
                            {suggestion.description}
                          </Text>
                        )}
                        <View style={styles.suggestionMeta}>
                          <Text
                            variant="titleLarge"
                            style={styles.suggestionPrice}
                          >
                            {formatPrice(suggestion.price)}
                          </Text>
                          {suggestion.link && (
                            <Button
                              mode="text"
                              icon="open-in-new"
                              compact
                              onPress={() => openLink(suggestion.link)}
                            >
                              View
                            </Button>
                          )}
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

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
  closeButton: {
    padding: 8,
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
  // Gifts Tab Styles
  giftsContainer: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  suggestionsList: {
    gap: 12,
  },
  suggestionCard: {
    marginBottom: 12,
  },
  suggestionImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f0f0f0",
  },
  suggestionTitle: {
    marginBottom: 6,
  },
  suggestionDescription: {
    marginBottom: 12,
  },
  suggestionMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  suggestionPrice: {
    color: "#000000",
  },
});
