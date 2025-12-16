import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#231F20" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{recipient.name}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !name.trim() || !relationshipType.trim()}
            style={[
              styles.saveButton,
              (saving || !name.trim() || !relationshipType.trim()) &&
                styles.saveButtonDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "gifts" && styles.activeTab]}
            onPress={() => setActiveTab("gifts")}
          >
            <Ionicons
              name="gift-outline"
              size={18}
              color={activeTab === "gifts" ? "#007AFF" : "#666"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "gifts" && styles.activeTabText,
              ]}
            >
              Gift Ideas
              {suggestions.length > 0 && (
                <Text style={styles.badgeText}> ({suggestions.length})</Text>
              )}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "details" && styles.activeTab]}
            onPress={() => setActiveTab("details")}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={activeTab === "details" ? "#007AFF" : "#666"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "details" && styles.activeTabText,
              ]}
            >
              Details
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {activeTab === "details" ? (
            /* Details Tab */
            <View style={styles.form}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <Text style={styles.label}>
                Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Sarah Johnson"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>
                Relationship <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={relationshipType}
                onChangeText={setRelationshipType}
                placeholder="e.g., Sister, Friend, Colleague"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Birthday</Text>
              <TextInput
                style={styles.input}
                value={birthday}
                onChangeText={setBirthday}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Interests</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={interests}
                onChangeText={setInterests}
                placeholder="e.g., reading, hiking, coffee (comma-separated)"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.sectionTitle}>Gift Preferences</Text>

              <Text style={styles.label}>Emotional Tone</Text>
              <TextInput
                style={styles.input}
                value={emotionalTone}
                onChangeText={setEmotionalTone}
                placeholder="e.g., heartfelt, playful, elegant"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Budget Range</Text>
              <View style={styles.budgetRow}>
                <View style={styles.budgetField}>
                  <Text style={styles.sublabel}>Min ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={budgetMin}
                    onChangeText={setBudgetMin}
                    placeholder="25"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.budgetField}>
                  <Text style={styles.sublabel}>Max ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={budgetMax}
                    onChangeText={setBudgetMax}
                    placeholder="100"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Shipping Address</Text>

              <Text style={styles.label}>Address Line 1</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="123 Main St"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Address Line 2</Text>
              <TextInput
                style={styles.input}
                value={addressLine2}
                onChangeText={setAddressLine2}
                placeholder="Apt 4B"
                placeholderTextColor="#999"
              />

              <View style={styles.addressRow}>
                <View style={styles.cityField}>
                  <Text style={styles.sublabel}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                    placeholder="New York"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.stateField}>
                  <Text style={styles.sublabel}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={state}
                    onChangeText={setState}
                    placeholder="NY"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.addressRow}>
                <View style={styles.zipField}>
                  <Text style={styles.sublabel}>Zip Code</Text>
                  <TextInput
                    style={styles.input}
                    value={zipCode}
                    onChangeText={setZipCode}
                    placeholder="10001"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.countryField}>
                  <Text style={styles.sublabel}>Country</Text>
                  <TextInput
                    style={styles.input}
                    value={country}
                    onChangeText={setCountry}
                    placeholder="US"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                <Text style={styles.deleteButtonText}>Delete Recipient</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Gifts Tab */
            <View style={styles.giftsContainer}>
              {loadingSuggestions ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFB6C1" />
                  <Text style={styles.loadingText}>
                    Loading gift suggestions...
                  </Text>
                </View>
              ) : suggestions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="gift-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Gift Ideas Yet</Text>
                  <Text style={styles.emptyText}>
                    Gift suggestions will appear here once they're generated for{" "}
                    {recipient.name}.
                  </Text>
                </View>
              ) : (
                <View style={styles.suggestionsList}>
                  {suggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={styles.suggestionCard}
                      onPress={() => openLink(suggestion.link)}
                      disabled={!suggestion.link}
                      activeOpacity={suggestion.link ? 0.7 : 1}
                    >
                      {suggestion.image_url && (
                        <Image
                          source={{ uri: suggestion.image_url }}
                          style={styles.suggestionImage}
                          resizeMode="cover"
                        />
                      )}
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionTitle}>
                          {suggestion.title}
                        </Text>
                        {suggestion.description && (
                          <Text
                            style={styles.suggestionDescription}
                            numberOfLines={2}
                          >
                            {suggestion.description}
                          </Text>
                        )}
                        <View style={styles.suggestionMeta}>
                          <Text style={styles.suggestionPrice}>
                            {formatPrice(suggestion.price)}
                          </Text>
                          {suggestion.link && (
                            <View style={styles.linkIndicator}>
                              <Ionicons
                                name="open-outline"
                                size={14}
                                color="#007AFF"
                              />
                              <Text style={styles.linkText}>View</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: "600",
    color: "#231F20",
    flex: 1,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  badgeText: {
    color: "#007AFF",
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 12,
    color: "#231F20",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  required: {
    color: "#FF3B30",
  },
  sublabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    color: "#231F20",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 32,
    marginBottom: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FF3B30",
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
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
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#231F20",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  suggestionsList: {
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  suggestionImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f0f0f0",
  },
  suggestionContent: {
    padding: 16,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 6,
  },
  suggestionDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  suggestionMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  suggestionPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#34C759",
  },
  linkIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
});
