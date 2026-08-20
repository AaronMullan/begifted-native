import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Switch,
  Divider,
} from "react-native-paper";
import * as Sentry from "@sentry/react-native";
import { useAppConfig, useUpdateAppConfig } from "@/hooks/use-app-config";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { AdminTheme } from "@/lib/admin-theme";

// Admin gating (loading / Access Denied) lives in app/admin/_layout.tsx.
const KillSwitchScreen: React.FC = () => {
  const router = useRouter();
  const configQuery = useAppConfig();
  const updateConfig = useUpdateAppConfig();

  const config = configQuery.data;
  const isPending = updateConfig.isPending;

  function toggle(
    flag:
      "recommendations_enabled" | "notifications_enabled" | "signups_enabled"
  ) {
    if (!config) return;
    updateConfig.mutate({ [flag]: !config[flag] });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <AdminNavbar title="Kill Switch" />

      <Text variant="bodyMedium" style={styles.subtitle}>
        Immediately disable features across the app. Changes take effect within
        30 seconds for active sessions.
      </Text>

      {configQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      {configQuery.isError && (
        <Text variant="bodyMedium" style={styles.errorText}>
          Failed to load config. Check admin permissions.
        </Text>
      )}

      {config && (
        <Card mode="contained" style={styles.card}>
          <Card.Content>
            <KillSwitchRow
              label="Gift Recommendations"
              description="Allow new gift suggestions to be generated for recipients"
              enabled={config.recommendations_enabled}
              onToggle={() => toggle("recommendations_enabled")}
              disabled={isPending}
            />
            <Divider style={styles.divider} />
            <KillSwitchRow
              label="Notifications"
              description="Allow notifications to be fetched and displayed"
              enabled={config.notifications_enabled}
              onToggle={() => toggle("notifications_enabled")}
              disabled={isPending}
            />
            <Divider style={styles.divider} />
            <KillSwitchRow
              label="New Signups"
              description="Allow new users to create accounts"
              enabled={config.signups_enabled}
              onToggle={() => toggle("signups_enabled")}
              disabled={isPending}
            />
          </Card.Content>
        </Card>
      )}

      {config && (
        <Text variant="bodySmall" style={styles.updatedAt}>
          Last updated: {new Date(config.updated_at).toLocaleString()}
        </Text>
      )}

      <View style={styles.promptSection}>
        <Text variant="titleMedium" style={styles.promptTitle}>
          Sentry Test
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Send a test exception to verify Sentry capture is wired correctly.
        </Text>
        <Button
          mode="outlined"
          icon="bug"
          style={styles.promptButton}
          onPress={() =>
            Sentry.captureException(new Error("sentry-test from kill-switch"))
          }
        >
          Send Test Event
        </Button>
      </View>

      <View style={styles.promptSection}>
        <Text variant="titleMedium" style={styles.promptTitle}>
          Prompt Rollback
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Roll back AI prompts to a previous version via the Prompt Versions
          screen.
        </Text>
        <Button
          mode="outlined"
          onPress={() => router.push("/admin/prompts")}
          icon="history"
          style={styles.promptButton}
        >
          Manage Prompt Versions
        </Button>
      </View>
    </ScrollView>
  );
};

type KillSwitchRowProps = {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled: boolean;
};

const KillSwitchRow: React.FC<KillSwitchRowProps> = ({
  label,
  description,
  enabled,
  onToggle,
  disabled,
}) => (
  <View style={styles.row}>
    <View style={styles.rowText}>
      <Text variant="titleSmall">{label}</Text>
      <Text variant="bodySmall" style={styles.rowDescription}>
        {description}
      </Text>
    </View>
    <View style={styles.rowRight}>
      <Text
        variant="labelSmall"
        style={enabled ? styles.enabledLabel : styles.disabledLabel}
      >
        {enabled ? "ON" : "OFF"}
      </Text>
      <Switch value={enabled} onValueChange={onToggle} disabled={disabled} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminTheme.screenBg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: AdminTheme.screenBg,
  },
  subtitle: {
    color: AdminTheme.muted,
    marginBottom: 16,
  },
  card: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: AdminTheme.panel,
    borderWidth: 1,
    borderColor: AdminTheme.border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    paddingRight: 16,
  },
  rowDescription: {
    color: AdminTheme.muted,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  enabledLabel: {
    color: AdminTheme.good,
    fontWeight: "bold",
  },
  disabledLabel: {
    color: AdminTheme.bad,
    fontWeight: "bold",
  },
  divider: {
    marginVertical: 0,
  },
  updatedAt: {
    color: AdminTheme.muted,
    marginBottom: 24,
    marginTop: 4,
  },
  errorText: {
    color: AdminTheme.bad,
    marginBottom: 16,
  },
  promptSection: {
    marginTop: 8,
  },
  promptTitle: {
    marginBottom: 4,
  },
  promptButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 8,
  },
});

export default KillSwitchScreen;
