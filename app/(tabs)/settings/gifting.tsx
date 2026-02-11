import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { supabase } from "../../../lib/supabase";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { Colors } from "../../../lib/colors";
import { useAuth } from "../../../hooks/use-auth";
import { IconButton } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import PreferenceCard from "../../../components/PreferenceCard";
import {
  PHILOSOPHY_OPTIONS,
  TONE_OPTIONS,
  CREATIVITY_OPTIONS,
  BUDGET_OPTIONS,
  PLANNING_OPTIONS,
  REMINDER_OPTIONS,
} from "../../../constants/gifting-preferences";

interface GiftingPreferencesFormData {
  giftingPhilosophy: string;
  giftingTone: string;
  creativityLevel: string;
  budgetStyle: string;
  planningStyle: string;
  reminderDays: string;
  autoFallbackEnabled: boolean;
}

export default function GiftingPreferences() {
  const { user, loading: authLoading } = useAuth();
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState<GiftingPreferencesFormData>({
    giftingPhilosophy: "",
    giftingTone: "",
    creativityLevel: "",
    budgetStyle: "",
    planningStyle: "",
    reminderDays: "7",
    autoFallbackEnabled: false,
  });

  const [originalFormData, setOriginalFormData] =
    useState<GiftingPreferencesFormData>(formData);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) {
      setPreferencesLoading(false);
      return;
    }
    fetchPreferences(user.id);
  }, [user]);

  async function fetchPreferences(userId: string) {
    try {
      setPreferencesLoading(true);
      const FETCH_TIMEOUT_MS = 15_000;
      const fetchPromise = supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), FETCH_TIMEOUT_MS)
      );
      const { data, error } = await Promise.race([
        fetchPromise,
        timeoutPromise,
      ]);

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching preferences:", error);
      }

      if (data) {
        // Extract values from user_stack JSON
        const userStack = (data.user_stack as any) || {};

        const prefs: GiftingPreferencesFormData = {
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
      // Show form with defaults on timeout or network error
    } finally {
      setPreferencesLoading(false);
    }
  }

  async function handleSave() {
    if (!user) {
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
        user_id: user.id,
        user_stack: userStack,
        default_gifting_tone: formData.giftingTone,
        reminder_days: parseInt(formData.reminderDays),
        auto_fallback_enabled: formData.autoFallbackEnabled,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_preferences")
        .upsert(updates, { onConflict: "user_id" })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setOriginalFormData(formData);
    } catch (error: unknown) {
      let message = "Unknown error";
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === "object") {
        const supabaseError = error as { message?: string; details?: string };
        message = supabaseError.message || message;
        if (supabaseError.details) {
          message += `\n\n${supabaseError.details}`;
        }
      }
      console.error("Error saving preferences:", error);
      const isNetworkError = /network request failed/i.test(message);
      Alert.alert(
        "Error",
        isNetworkError
          ? "Network request failed. Check your internet connection and try again."
          : `Failed to save preferences: ${message}`
      );
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    JSON.stringify(formData) !== JSON.stringify(originalFormData);
  const currentReminderLabel =
    REMINDER_OPTIONS.find((opt) => opt.value === formData.reminderDays)
      ?.label || "1 week before";

  const loading = authLoading || preferencesLoading;
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSpacer} />
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSpacer} />
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
    <View style={styles.container}>
      <View style={styles.headerSpacer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Main card container – match dashboard/settings card style */}
          <Pressable style={styles.mainCard}>
            <BlurView
              intensity={20}
              style={styles.blurBackground}
              pointerEvents="none"
            />
            <View style={styles.mainCardContent}>
              {/* Header section */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>Gifting Preferences</Text>
                  <Text style={styles.subtitle}>
                    Customize how AI generates gift recommendations based on
                    your personal style and preferences.
                  </Text>
                </View>
                <IconButton
                  icon="arrow-left"
                  size={20}
                  iconColor="#000000"
                  onPress={() => router.back()}
                  style={styles.backButton}
                />
              </View>

              {/* Preference Cards */}
              <View style={styles.preferencesContainer}>
                <PreferenceCard
                  title="Gifting Philosophy"
                  value={formData.giftingPhilosophy}
                  options={PHILOSOPHY_OPTIONS}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      giftingPhilosophy: value,
                    }))
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
                    <Text style={styles.reminderValue}>
                      {currentReminderLabel}
                    </Text>
                    <MaterialIcons
                      name={showReminderPicker ? "expand-less" : "expand-more"}
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
                            <MaterialIcons
                              name="check"
                              size={20}
                              color="#000000"
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Floating Save Button - only shown when there are unsaved changes */}
      {hasChanges && (
        <View style={styles.floatingSaveContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={[
              styles.floatingSaveButton,
              saving && styles.floatingSaveButtonSaving,
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingSaveButtonText}>
              {saving ? "Saving..." : "Save Preferences"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerSpacer: {
    height: HEADER_HEIGHT,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: BOTTOM_NAV_HEIGHT + 100, // Extra space for floating save button
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  mainCard: {
    backgroundColor: Colors.neutrals.light + "30",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    overflow: "hidden",
    position: "relative",
    marginTop: 20,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  mainCardContent: {
    padding: 24,
    position: "relative",
    zIndex: 1,
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
    color: Colors.darks.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.darks.black,
    opacity: 0.8,
  },
  backButton: {
    margin: 0,
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
    color: Colors.darks.black,
    marginBottom: 12,
  },
  reminderSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    backgroundColor: Colors.neutrals.light + "30",
  },
  reminderValue: {
    fontSize: 16,
    color: Colors.darks.black,
  },
  reminderPicker: {
    marginTop: 8,
    backgroundColor: Colors.neutrals.light + "30",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    overflow: "hidden",
  },
  reminderOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white,
  },
  reminderOptionSelected: {
    backgroundColor: Colors.neutrals.light + "50",
  },
  reminderOptionText: {
    fontSize: 16,
    color: Colors.darks.black,
  },
  reminderOptionTextSelected: {
    fontWeight: "600",
    color: Colors.darks.black,
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
    color: "#000000",
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  floatingSaveContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 12,
    paddingTop: 12,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  floatingSaveButton: {
    backgroundColor: "#000000",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  floatingSaveButtonSaving: {
    opacity: 0.7,
  },
  floatingSaveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
  },
});
