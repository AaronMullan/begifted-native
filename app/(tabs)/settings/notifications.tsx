import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Linking,
  AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { Text, IconButton } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import { Spacing } from "../../../lib/spacing";
import type { Session } from "@supabase/supabase-js";
import { showSnackbar } from "../../../components/GlobalSnackbar";

// The v4 frame's three-row set. Reminder count is bounded 1–3 by the design's
// pill selector.
interface NotificationPreferences {
  push_notifications_enabled: boolean;
  occasion_reminders_enabled: boolean;
  reminder_count: number;
  promotional_emails_enabled: boolean;
}

const REMINDER_COUNTS = [1, 2, 3];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  push_notifications_enabled: true,
  occasion_reminders_enabled: true,
  reminder_count: 2,
  promotional_emails_enabled: false,
};

type ToggleRowProps = {
  label: string;
  caption: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  children?: React.ReactNode;
};

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  caption,
  value,
  onValueChange,
  children,
}) => (
  <View style={styles.row}>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowCaption}>{caption}</Text>
      {children}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{
        false: Colors.grays.border,
        true: Colors.brand.mediumTeal,
      }}
      thumbColor={Colors.white}
    />
  </View>
);

const Rule: React.FC = () => <View style={styles.rule} />;

export default function NotificationsSettings() {
  const insets = useSafeAreaInsets();
  const headerSpacerHeight = Math.max(HEADER_HEIGHT, insets.top + 60);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushPermissionGranted, setPushPermissionGranted] = useState(true);
  const router = useRouter();

  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  async function fetchPreferences(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_preferences")
        .select(
          "push_notifications_enabled, occasion_reminders_enabled, reminder_count, promotional_emails_enabled"
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching preferences:", error);
      }

      if (data) {
        setPreferences({
          push_notifications_enabled:
            data.push_notifications_enabled ??
            DEFAULT_PREFERENCES.push_notifications_enabled,
          occasion_reminders_enabled:
            data.occasion_reminders_enabled ??
            DEFAULT_PREFERENCES.occasion_reminders_enabled,
          reminder_count:
            data.reminder_count ?? DEFAULT_PREFERENCES.reminder_count,
          promotional_emails_enabled:
            data.promotional_emails_enabled ??
            DEFAULT_PREFERENCES.promotional_emails_enabled,
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  }

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
      if (!session) {
        setLoading(false);
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // The "Open Settings" sub-CTA reflects OS-level permission, re-checked when
  // the app returns to the foreground so granting in iOS Settings updates the
  // row without a manual refresh.
  useEffect(() => {
    const check = () =>
      Notifications.getPermissionsAsync().then(({ status }) =>
        setPushPermissionGranted(status === "granted")
      );
    check();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => listener.remove();
  }, []);

  // No Save button in the v4 frame — every change persists immediately.
  // Optimistic update; revert on failure.
  async function persist(update: Partial<NotificationPreferences>) {
    if (!session?.user) return;
    const previous = preferences;
    const next = { ...preferences, ...update };
    setPreferences(next);

    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: session.user.id,
        ...next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Error saving preferences:", error);
      setPreferences(previous);
      showSnackbar(
        "Couldn't save your notification settings. Please try again."
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSpacer} />
        <View style={styles.content}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.rowCaption}>
            Please sign in to manage your notifications.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <IconButton
              icon="chevron-left"
              size={20}
              iconColor={Colors.brand.darkTeal}
              onPress={() => router.back()}
              style={styles.backButton}
            />
            <Text style={styles.title}>Notifications</Text>
          </View>

          <Rule />
          <ToggleRow
            label="Push Notifications"
            caption={
              pushPermissionGranted
                ? "Turn all BeGifted alerts on or off."
                : "Turn on notifications in Settings so BeGifted can remind you about upcoming occasions"
            }
            value={preferences.push_notifications_enabled}
            onValueChange={(value) =>
              persist({ push_notifications_enabled: value })
            }
          >
            {!pushPermissionGranted ? (
              <Pressable
                onPress={() => Linking.openSettings()}
                accessibilityRole="button"
                accessibilityLabel="Open Settings"
                style={styles.openSettingsCta}
              >
                <Text style={styles.openSettingsLabel}>Open Settings</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={14}
                  color={Colors.brand.mediumTeal}
                />
              </Pressable>
            ) : null}
          </ToggleRow>

          <Rule />
          <ToggleRow
            label="Gift & Occasion Reminders"
            caption="Birthdays, holidays, and new recommendations"
            value={preferences.occasion_reminders_enabled}
            onValueChange={(value) =>
              persist({ occasion_reminders_enabled: value })
            }
          />

          {/* Grouped directly beneath the reminders toggle — no divider. */}
          <View style={styles.reminderCountGroup}>
            <Text style={styles.rowLabel}>How Many Reminders?</Text>
            <Text style={styles.rowCaption}>
              Starting 3 weeks before the occasion
            </Text>
            <View style={styles.reminderCountOptions}>
              {REMINDER_COUNTS.map((count) => {
                const selected = preferences.reminder_count === count;
                return (
                  <Pressable
                    key={count}
                    onPress={() => persist({ reminder_count: count })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${count} reminder${count === 1 ? "" : "s"}`}
                    style={[
                      styles.countPill,
                      selected && styles.countPillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countPillLabel,
                        selected && styles.countPillLabelSelected,
                      ]}
                    >
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Rule />
          <ToggleRow
            label="Product Updates"
            caption="New features and improvements"
            value={preferences.promotional_emails_enabled}
            onValueChange={(value) =>
              persist({ promotional_emails_enabled: value })
            }
          />
          <Rule />
        </View>
      </ScrollView>
    </View>
  );
}

// Spec: Figma frame 4518:3896 ("Notifications v4") — rows are 338 wide inset
// to x=32 (Spacing.sectionHeadInset) on the 402pt frame, bounded by 1px white
// rule lines, DM Sans subhead labels over mediumTeal captions, 44×26 toggles.
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
    paddingBottom: BOTTOM_NAV_HEIGHT + 40,
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: Spacing.sectionHeadInset,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
    // The frame's header sits at the row edge; IconButton pads its 44pt tap
    // target, so pull it back to keep the chevron on the gutter line.
    marginLeft: -12,
  },
  backButton: {
    margin: 0,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  rule: {
    height: 1,
    backgroundColor: Colors.white,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 24,
  },
  rowText: {
    flex: 1,
    gap: 2,
    marginRight: 16,
  },
  rowLabel: {
    ...Typography.subhead,
    lineHeight: 20,
    color: Colors.brand.darkTeal,
  },
  rowCaption: {
    ...Typography.caption,
    color: Colors.brand.mediumTeal,
  },
  openSettingsCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  openSettingsLabel: {
    ...Typography.smallCta,
    color: Colors.brand.mediumTeal,
  },
  reminderCountGroup: {
    gap: 5,
    paddingBottom: 24,
  },
  reminderCountOptions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  countPill: {
    width: 48,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.brand.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillSelected: {
    backgroundColor: Colors.brand.darkTeal,
    borderColor: Colors.brand.darkTeal,
  },
  countPillLabel: {
    ...Typography.tagLabel,
    color: Colors.brand.darkTeal,
  },
  countPillLabelSelected: {
    color: Colors.white,
  },
  loadingText: {
    ...Typography.subhead,
    textAlign: "center",
    color: Colors.darks.black,
    opacity: 0.9,
  },
});
