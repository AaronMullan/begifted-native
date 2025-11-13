import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons";
import PreferenceCard from "../../components/PreferenceCard";
import {
  PHILOSOPHY_OPTIONS,
  TONE_OPTIONS,
  CREATIVITY_OPTIONS,
  BUDGET_OPTIONS,
  PLANNING_OPTIONS,
  REMINDER_OPTIONS,
} from "../../constants/gifting-preferences";

interface GiftingPreferences {
  giftingPhilosophy: string;
  giftingTone: string;
  creativityLevel: string;
  budgetStyle: string;
  planningStyle: string;
  reminderDays: string;
  autoFallbackEnabled: boolean;
}

export default function GiftingPreferences() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState<GiftingPreferences>({
    giftingPhilosophy: "",
    giftingTone: "",
    creativityLevel: "",
    budgetStyle: "",
    planningStyle: "",
    reminderDays: "7",
    autoFallbackEnabled: false,
  });

  const [originalFormData, setOriginalFormData] = useState<GiftingPreferences>(
    formData
  );
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchPreferences(session.user.id);
      } else {
        setLoading(false);
        router.replace("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchPreferences(session.user.id);
      } else {
        setLoading(false);
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchPreferences(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching preferences:", error);
      }

      if (data) {
        // Extract values from user_stack JSON
        const userStack = (data.user_stack as any) || {};

        const prefs: GiftingPreferences = {
          giftingPhilosophy: userStack.philosophy || "",
          giftingTone: data.default_gifting_tone || "",
          creativityLevel: userStack.creativity || "",
          budgetStyle: userStack.budget_style || "",
          planningStyle: userStack.planning_style || "",
          reminderDays: (data.reminder_days || 7).toString(),
          autoFallbackEnabled: data.auto_fallback_enabled || false,
        };

        setFormData(prefs);
        setOriginalFormData(prefs);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!session?.user) {
      return;
    }

    try {
      setSaving(true);

      // Update user_stack JSON and other fields
      const userStack = {
        philosophy: formData.giftingPhilosophy,
        creativity: formData.creativityLevel,
        budget_style: formData.budgetStyle,
        planning_style: formData.planningStyle,
      };

      const updates = {
        user_id: session.user.id,
        user_stack: userStack,
        default_gifting_tone: formData.giftingTone,
        reminder_days: parseInt(formData.reminderDays),
        auto_fallback_enabled: formData.autoFallbackEnabled,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_preferences")
        .upsert(updates)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setOriginalFormData(formData);
    } catch (error) {
      console.error("Error saving preferences:", error);
      if (error instanceof Error) {
        alert(`Failed to save preferences: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    JSON.stringify(formData) !== JSON.stringify(originalFormData);
  const currentReminderLabel =
    REMINDER_OPTIONS.find((opt) => opt.value === formData.reminderDays)
      ?.label || "1 week before";

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Gifting Preferences</Text>
          <Text style={styles.subtitle}>
            Please sign in to manage your preferences.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Main white card container */}
        <View style={styles.mainCard}>
          {/* Header section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Gifting Preferences</Text>
              <Text style={styles.subtitle}>
                Customize how AI generates gift recommendations based on your
                personal style and preferences.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={20} color="#231F20" />
            </TouchableOpacity>
          </View>

          {/* Preference Cards */}
          <View style={styles.preferencesContainer}>
            <PreferenceCard
              title="Gifting Philosophy"
              value={formData.giftingPhilosophy}
              options={PHILOSOPHY_OPTIONS}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, giftingPhilosophy: value }))
              }
            />

            <PreferenceCard
              title="Gifting Tone"
              value={formData.giftingTone}
              options={TONE_OPTIONS}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, giftingTone: value }))
              }
            />

            <PreferenceCard
              title="Creativity Level"
              value={formData.creativityLevel}
              options={CREATIVITY_OPTIONS}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, creativityLevel: value }))
              }
            />

            <PreferenceCard
              title="Budget Style"
              value={formData.budgetStyle}
              options={BUDGET_OPTIONS}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, budgetStyle: value }))
              }
            />

            <PreferenceCard
              title="Planning Style"
              value={formData.planningStyle}
              options={PLANNING_OPTIONS}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, planningStyle: value }))
              }
            />

            {/* Default Reminder Time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Default Reminder Time</Text>
              <TouchableOpacity
                style={styles.reminderSelector}
                onPress={() => setShowReminderPicker(!showReminderPicker)}
              >
                <Text style={styles.reminderValue}>{currentReminderLabel}</Text>
                <Ionicons
                  name={showReminderPicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>

              {showReminderPicker && (
                <View style={styles.reminderPicker}>
                  {REMINDER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.reminderOption,
                        formData.reminderDays === option.value &&
                          styles.reminderOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData((prev) => ({
                          ...prev,
                          reminderDays: option.value,
                        }));
                        setShowReminderPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.reminderOptionText,
                          formData.reminderDays === option.value &&
                            styles.reminderOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {formData.reminderDays === option.value && (
                        <Ionicons name="checkmark" size={20} color="#FFB6C1" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Automatic Gift Suggestions */}
            <View style={styles.switchSection}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>
                  Automatic Gift Suggestions
                </Text>
                <Text style={styles.switchDescription}>
                  Enable automatic gift suggestions as backup when manual
                  selection isn't made
                </Text>
              </View>
              <Switch
                value={formData.autoFallbackEnabled}
                onValueChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    autoFallbackEnabled: checked,
                  }))
                }
                trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              !hasChanges && styles.saveButtonDisabled,
              saving && styles.saveButtonSaving,
            ]}
            onPress={handleSave}
            disabled={saving || !hasChanges}
          >
            <Text
              style={[
                styles.saveButtonText,
                !hasChanges && styles.saveButtonTextDisabled,
              ]}
            >
              {saving ? "Saving..." : hasChanges ? "Save Preferences" : "No Changes"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6E6FA", // Light purple background
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  mainCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#231F20",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  preferencesContainer: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 12,
  },
  reminderSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  reminderValue: {
    fontSize: 16,
    color: "#231F20",
  },
  reminderPicker: {
    marginTop: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    overflow: "hidden",
  },
  reminderOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  reminderOptionSelected: {
    backgroundColor: "#fff",
  },
  reminderOptionText: {
    fontSize: 16,
    color: "#231F20",
  },
  reminderOptionTextSelected: {
    fontWeight: "600",
    color: "#FFB6C1",
  },
  switchSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    marginBottom: 24,
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: "#FFB6C1",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#E0E0E0",
    opacity: 0.6,
  },
  saveButtonSaving: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonTextDisabled: {
    color: "#666",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
  },
});

