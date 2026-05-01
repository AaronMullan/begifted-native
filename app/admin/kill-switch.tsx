import React from "react";
import { View, ScrollView, StyleSheet, Platform } from "react-native";
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Switch,
  Divider,
} from "react-native-paper";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { fetchIsAdmin } from "@/lib/api";
import { useAppConfig, useUpdateAppConfig } from "@/hooks/use-app-config";
import { Colors } from "@/lib/colors";

const KillSwitchScreen: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const adminQuery = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: () => fetchIsAdmin(user!.id),
    enabled: !!user?.id,
  });

  if (authLoading || adminQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user || !adminQuery.data) {
    return (
      <View style={styles.center}>
        <Text variant="headlineMedium">Access Denied</Text>
        <Text variant="bodyLarge" style={styles.accessDeniedBody}>
          You do not have admin access to the kill switch.
        </Text>
      </View>
    );
  }

  return <KillSwitchContent />;
};

const KillSwitchContent: React.FC = () => {
  const configQuery = useAppConfig();
  const updateConfig = useUpdateAppConfig();

  const config = configQuery.data;
  const isPending = updateConfig.isPending;

  function toggle(
    flag: "recommendations_enabled" | "notifications_enabled" | "signups_enabled"
  ) {
    if (!config) return;
    updateConfig.mutate({ [flag]: !config[flag] });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall">Kill Switch</Text>
        <Button
          mode="text"
          onPress={() => {
            if (Platform.OS === "web") {
              window.location.href = "/admin/playground";
            }
          }}
          icon="arrow-left"
          compact
        >
          Back to Playground
        </Button>
      </View>

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
        <Card style={styles.card}>
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
          Prompt Rollback
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Roll back AI prompts to a previous version via the Prompt Versions
          screen.
        </Text>
        <Button
          mode="outlined"
          onPress={() => {
            if (Platform.OS === "web") {
              window.location.href = "/admin/prompts";
            }
          }}
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
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.white,
  },
  accessDeniedBody: {
    marginTop: 8,
    color: Colors.darks.brown,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  subtitle: {
    color: Colors.darks.brown,
    marginBottom: 16,
  },
  card: {
    marginBottom: 8,
    borderRadius: 8,
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
    color: Colors.darks.brown,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  enabledLabel: {
    color: Colors.blues.teal,
    fontWeight: "bold",
  },
  disabledLabel: {
    color: "#FF3B30",
    fontWeight: "bold",
  },
  divider: {
    marginVertical: 0,
  },
  updatedAt: {
    color: "#888",
    marginBottom: 24,
    marginTop: 4,
  },
  errorText: {
    color: "#FF3B30",
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
