import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Dialog, IconButton, Portal, Text, TextInput } from "react-native-paper";
import { useAuth } from "../../../hooks/use-auth";
import { Colors } from "../../../lib/colors";
import { BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { supabase } from "../../../lib/supabase";

const REMINDER_OPTIONS = [
  { value: "14", label: "2 weeks before" },
  { value: "7", label: "1 week before" },
  { value: "3", label: "3 days before" },
  { value: "1", label: "1 day before" },
  { value: "0", label: "Day of event" },
];

export default function GiftingPreferences() {
  const { user, loading: authLoading } = useAuth();
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [giftingStyleText, setGiftingStyleText] = useState("");
  const [originalGiftingStyleText, setOriginalGiftingStyleText] = useState("");
  const [reminderDays, setReminderDays] = useState("7");
  const [originalReminderDays, setOriginalReminderDays] = useState("7");
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const [errorDialogVisible, setErrorDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        // Fall back to user_description from onboarding if no gifting style text yet
        const text = data.gifting_style_text || data.user_description || "";
        const reminder = (data.reminder_days || 7).toString();
        setGiftingStyleText(text);
        setOriginalGiftingStyleText(text);
        setReminderDays(reminder);
        setOriginalReminderDays(reminder);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setPreferencesLoading(false);
    }
  }

  async function handleSave() {
    if (!user) return;

    try {
      setSaving(true);

      let userSummary = undefined;

      if (giftingStyleText.trim() && giftingStyleText !== originalGiftingStyleText) {
        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke(
            "extract-user-preferences",
            { body: { text: giftingStyleText.trim() } }
          );

          if (fnError) {
            console.error("Error extracting preferences:", fnError);
          } else if (fnData?.user_summary) {
            userSummary = fnData.user_summary;
          }
        } catch (extractError) {
          console.error("Error calling extract function:", extractError);
        }
      }

      const updates: Record<string, unknown> = {
        user_id: user.id,
        gifting_style_text: giftingStyleText.trim(),
        reminder_days: parseInt(reminderDays),
        updated_at: new Date().toISOString(),
      };

      if (userSummary) {
        updates.user_summary = userSummary;
      }

      const { error } = await supabase
        .from("user_preferences")
        .upsert(updates, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;

      setOriginalGiftingStyleText(giftingStyleText);
      setOriginalReminderDays(reminderDays);

      // Re-synthesize giver profile in the background when gifting text changed
      if (giftingStyleText.trim() && giftingStyleText !== originalGiftingStyleText) {
        supabase.functions
          .invoke("synthesize-giver-profile", { body: { userId: user.id } })
          .catch(() => {});
      }
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
      setErrorMessage(
        isNetworkError
          ? "Network request failed. Check your internet connection and try again."
          : `Failed to save preferences: ${message}`
      );
      setErrorDialogVisible(true);
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    giftingStyleText !== originalGiftingStyleText ||
    reminderDays !== originalReminderDays;

  const currentReminderLabel =
    REMINDER_OPTIONS.find((opt) => opt.value === reminderDays)?.label ||
    "1 week before";

  const loading = authLoading || preferencesLoading;
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSpacer} />
        <View style={styles.content}>
          <Text variant="bodyLarge" style={styles.loadingText}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSpacer} />
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>
            Gifting Preferences
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Please sign in to manage your preferences.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <View style={styles.headerSpacer} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.content}>
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
                  <Text variant="headlineSmall" style={styles.title}>
                    Gifting Preferences
                  </Text>
                  <Text variant="bodyMedium" style={styles.subtitle}>
                    Describe your gifting style in your own words. We&apos;ll personalize your gift recommendations.
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

              {/* Gifting style text input */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Your Gifting Style
                </Text>
                <TextInput
                  mode="outlined"
                  placeholder="e.g. I like to give thoughtful, handmade gifts. I prefer spending moderately and planning ahead. I tend to be warm and personal with my gift choices..."
                  value={giftingStyleText}
                  onChangeText={setGiftingStyleText}
                  multiline
                  numberOfLines={6}
                  style={styles.textInput}
                  outlineStyle={styles.textInputOutline}
                  contentStyle={styles.textInputContent}
                />
              </View>

              {/* Default Reminder Time */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Default Reminder Time
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowReminderPicker(!showReminderPicker)}
                  contentStyle={styles.reminderButtonContent}
                  labelStyle={styles.reminderButtonLabel}
                  icon={({ size }) => (
                    <MaterialIcons
                      name={showReminderPicker ? "expand-less" : "expand-more"}
                      size={size}
                      color={Colors.darks.black}
                    />
                  )}
                >
                  {currentReminderLabel}
                </Button>

                {showReminderPicker && (
                  <View style={styles.reminderPicker}>
                    {REMINDER_OPTIONS.map((option) => (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.reminderOption,
                          reminderDays === option.value &&
                            styles.reminderOptionSelected,
                        ]}
                        onPress={() => {
                          setReminderDays(option.value);
                          setShowReminderPicker(false);
                        }}
                      >
                        <Text
                          variant="bodyLarge"
                          style={[
                            styles.reminderOptionText,
                            reminderDays === option.value &&
                              styles.reminderOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {reminderDays === option.value && (
                          <MaterialIcons
                            name="check"
                            size={20}
                            color={Colors.darks.black}
                          />
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        </View>
      </ScrollView>

        {/* Floating Save Button */}
        {hasChanges && (
          <View style={styles.floatingSaveContainer} pointerEvents="box-none">
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              contentStyle={styles.floatingSaveContent}
              labelStyle={styles.floatingSaveLabel}
              style={styles.floatingSaveButton}
            >
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </View>
        )}
      </Pressable>

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={errorDialogVisible}
          onDismiss={() => setErrorDialogVisible(false)}
        >
          <Dialog.Title>Error</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setErrorDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  scrollContent: {
    paddingBottom: BOTTOM_NAV_HEIGHT + 100,
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
    color: Colors.darks.black,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.darks.black,
    opacity: 0.8,
  },
  backButton: {
    margin: 0,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.darks.black,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.6)",
    minHeight: 140,
  },
  textInputOutline: {
    borderRadius: 18,
  },
  textInputContent: {
    paddingTop: 16,
  },
  reminderButtonContent: {
    justifyContent: "space-between",
    flexDirection: "row-reverse",
    paddingVertical: 8,
  },
  reminderButtonLabel: {
    color: Colors.darks.black,
    fontSize: 16,
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
    color: Colors.darks.black,
  },
  reminderOptionTextSelected: {
    fontWeight: "600",
    color: Colors.darks.black,
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
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
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
  floatingSaveContent: {
    paddingVertical: 8,
  },
  floatingSaveLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
  },
});
