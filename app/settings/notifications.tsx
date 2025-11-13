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

interface NotificationPreferences {
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  reminder_2_weeks_before: boolean;
  reminder_1_week_before: boolean;
  reminder_day_of_event: boolean;
  feedback_requests_enabled: boolean;
  system_updates_enabled: boolean;
  promotional_emails_enabled: boolean;
  timezone: string;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
];

export default function Notifications() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_notifications_enabled: true,
    email_notifications_enabled: true,
    reminder_2_weeks_before: true,
    reminder_1_week_before: true,
    reminder_day_of_event: true,
    feedback_requests_enabled: true,
    system_updates_enabled: true,
    promotional_emails_enabled: false,
    timezone: "America/New_York",
  });

  const [originalPreferences, setOriginalPreferences] =
    useState<NotificationPreferences>(preferences);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);

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
        const prefs: NotificationPreferences = {
          push_notifications_enabled:
            data.push_notifications_enabled ?? true,
          email_notifications_enabled:
            data.email_notifications_enabled ?? true,
          reminder_2_weeks_before: data.reminder_2_weeks_before ?? true,
          reminder_1_week_before: data.reminder_1_week_before ?? true,
          reminder_day_of_event: data.reminder_day_of_event ?? true,
          feedback_requests_enabled: data.feedback_requests_enabled ?? true,
          system_updates_enabled: data.system_updates_enabled ?? true,
          promotional_emails_enabled: data.promotional_emails_enabled ?? false,
          timezone: data.timezone || "America/New_York",
        };
        setPreferences(prefs);
        setOriginalPreferences(prefs);
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

      const updates = {
        user_id: session.user.id,
        push_notifications_enabled: preferences.push_notifications_enabled,
        email_notifications_enabled: preferences.email_notifications_enabled,
        reminder_2_weeks_before: preferences.reminder_2_weeks_before,
        reminder_1_week_before: preferences.reminder_1_week_before,
        reminder_day_of_event: preferences.reminder_day_of_event,
        feedback_requests_enabled: preferences.feedback_requests_enabled,
        system_updates_enabled: preferences.system_updates_enabled,
        promotional_emails_enabled: preferences.promotional_emails_enabled,
        timezone: preferences.timezone,
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

      setOriginalPreferences(preferences);
    } catch (error) {
      console.error("Error saving preferences:", error);
      if (error instanceof Error) {
        alert(`Failed to save preferences: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  function togglePreference(key: keyof NotificationPreferences) {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function setTimezone(timezone: string) {
    setPreferences((prev) => ({
      ...prev,
      timezone,
    }));
    setShowTimezonePicker(false);
  }

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
  const currentTimezoneLabel =
    TIMEZONES.find((tz) => tz.value === preferences.timezone)?.label ||
    "Eastern Time (ET)";

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
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Please sign in to manage your notifications.
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
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>
                Manage your communication preferences
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={20} color="#231F20" />
            </TouchableOpacity>
          </View>

          {/* Notification Methods Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Methods</Text>
            <Text style={styles.sectionSubtitle}>
              Choose how you'd like to receive notifications.
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications directly in your browser.
                </Text>
              </View>
              <Switch
                value={preferences.push_notifications_enabled}
                onValueChange={() =>
                  togglePreference("push_notifications_enabled")
                }
                trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications via email.
                </Text>
              </View>
              <Switch
                value={preferences.email_notifications_enabled}
                onValueChange={() =>
                  togglePreference("email_notifications_enabled")
                }
                trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Reminder Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Preferences</Text>
            <Text style={styles.sectionSubtitle}>
              Configure when you'd like to be reminded about upcoming occasions.
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>2 Weeks Before</Text>
                <Text style={styles.settingDescription}>
                  Get reminded 2 weeks before an occasion.
                </Text>
              </View>
              <Switch
                value={preferences.reminder_2_weeks_before}
                onValueChange={() => togglePreference("reminder_2_weeks_before")}
                trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>1 Week Before</Text>
                <Text style={styles.settingDescription}>
                  Get reminded 1 week before an occasion.
                </Text>
              </View>
              <Switch
                value={preferences.reminder_1_week_before}
                onValueChange={() => togglePreference("reminder_1_week_before")}
                trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Day of Event</Text>
                <Text style={styles.settingDescription}>
                  Get reminded on the day of the occasion.
                </Text>
              </View>
              <Switch
                value={preferences.reminder_day_of_event}
                onValueChange={() => togglePreference("reminder_day_of_event")}
                trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Communication Types Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Communication Types</Text>
            <Text style={styles.sectionSubtitle}>
              Choose what types of communications you'd like to receive.
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Feedback Requests</Text>
                <Text style={styles.settingDescription}>
                  Get asked for feedback after sending gifts.
                </Text>
              </View>
              <Switch
                value={preferences.feedback_requests_enabled}
                onValueChange={() => togglePreference("feedback_requests_enabled")}
                trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>System Updates</Text>
                <Text style={styles.settingDescription}>
                  Receive important app updates and announcements.
                </Text>
              </View>
              <Switch
                value={preferences.system_updates_enabled}
                onValueChange={() => togglePreference("system_updates_enabled")}
                trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Promotional Emails</Text>
                <Text style={styles.settingDescription}>
                  Receive tips, feature highlights, and special offers.
                </Text>
              </View>
              <Switch
                value={preferences.promotional_emails_enabled}
                onValueChange={() =>
                  togglePreference("promotional_emails_enabled")
                }
                trackColor={{ false: "#E0E0E0", true: "#FFB6C1" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Timezone Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timezone Settings</Text>
            <Text style={styles.sectionSubtitle}>
              Set your timezone for accurate notification timing.
            </Text>

            <TouchableOpacity
              style={styles.timezoneSelector}
              onPress={() => setShowTimezonePicker(!showTimezonePicker)}
            >
              <View style={styles.timezoneInfo}>
                <Text style={styles.settingLabel}>Timezone</Text>
                <Text style={styles.timezoneValue}>{currentTimezoneLabel}</Text>
              </View>
              <Ionicons
                name={showTimezonePicker ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {showTimezonePicker && (
              <View style={styles.timezonePicker}>
                {TIMEZONES.map((tz) => (
                  <TouchableOpacity
                    key={tz.value}
                    style={[
                      styles.timezoneOption,
                      preferences.timezone === tz.value &&
                        styles.timezoneOptionSelected,
                    ]}
                    onPress={() => setTimezone(tz.value)}
                  >
                    <Text
                      style={[
                        styles.timezoneOptionText,
                        preferences.timezone === tz.value &&
                          styles.timezoneOptionTextSelected,
                      ]}
                    >
                      {tz.label}
                    </Text>
                    {preferences.timezone === tz.value && (
                      <Ionicons name="checkmark" size={20} color="#FFB6C1" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
              {saving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#231F20",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  timezoneSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timezoneInfo: {
    flex: 1,
  },
  timezoneValue: {
    fontSize: 16,
    color: "#231F20",
    marginTop: 4,
  },
  timezonePicker: {
    marginTop: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    overflow: "hidden",
  },
  timezoneOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  timezoneOptionSelected: {
    backgroundColor: "#fff",
  },
  timezoneOptionText: {
    fontSize: 16,
    color: "#231F20",
  },
  timezoneOptionTextSelected: {
    fontWeight: "600",
    color: "#FFB6C1",
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

