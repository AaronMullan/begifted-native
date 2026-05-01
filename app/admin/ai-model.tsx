import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { useAppConfig, useUpdateAppConfig } from "@/hooks/use-app-config";
import { useAuth } from "@/hooks/use-auth";
import type { Provider } from "@/lib/ai-models";
import { PROVIDER_MODELS } from "@/lib/ai-models";
import { fetchIsAdmin } from "@/lib/api";
import { Colors } from "@/lib/colors";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  Menu,
  SegmentedButtons,
  Text,
} from "react-native-paper";

const AiModelScreen: React.FC = () => {
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
          You do not have admin access to AI model configuration.
        </Text>
      </View>
    );
  }

  return <AiModelContent />;
};

const AiModelContent: React.FC = () => {
  const configQuery = useAppConfig();
  const updateConfig = useUpdateAppConfig();
  const [modelMenuVisible, setModelMenuVisible] = useState(false);

  const config = configQuery.data;
  const isPending = updateConfig.isPending;

  function selectProvider(provider: Provider) {
    if (!config) return;
    updateConfig.mutate({ ai_provider: provider, ai_model: PROVIDER_MODELS[provider][0] });
  }

  function selectModel(model: string) {
    if (!config) return;
    updateConfig.mutate({ ai_model: model });
    setModelMenuVisible(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <AdminNavbar title="AI Model" />

      <Text variant="bodyMedium" style={styles.subtitle}>
        Configure the AI provider and model used for all edge function calls.
        Changes take effect immediately for new requests.
      </Text>

      {configQuery.isLoading && <ActivityIndicator />}

      {configQuery.isError && (
        <Text variant="bodyMedium" style={styles.errorText}>
          Failed to load config. Check admin permissions.
        </Text>
      )}

      {config && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Provider
            </Text>
            <SegmentedButtons
              value={config.ai_provider}
              onValueChange={(v) => selectProvider(v as Provider)}
              buttons={[
                { value: "openai", label: "OpenAI", showSelectedCheck: false },
                { value: "anthropic", label: "Claude", showSelectedCheck: false },
                { value: "google", label: "Google", showSelectedCheck: false },
              ]}
              style={styles.segmentedButtons}
              density="small"
            />
            <Divider style={styles.divider} />
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Model
            </Text>
            <Menu
              visible={modelMenuVisible}
              onDismiss={() => setModelMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setModelMenuVisible(true)}
                  disabled={isPending}
                  compact
                  icon="chevron-down"
                  style={styles.modelButton}
                >
                  {config.ai_model}
                </Button>
              }
            >
              {PROVIDER_MODELS[config.ai_provider].map((m) => (
                <Menu.Item key={m} onPress={() => selectModel(m)} title={m} />
              ))}
            </Menu>
            
          </Card.Content>
        </Card>
      )}

      {config && (
        <Text variant="bodySmall" style={styles.updatedAt}>
          Last updated: {new Date(config.updated_at).toLocaleString()}
        </Text>
      )}
    </ScrollView>
  );
};

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
  subtitle: {
    color: Colors.darks.brown,
    marginBottom: 16,
  },
  card: {
    marginBottom: 8,
    borderRadius: 8,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 12,
  },
  modelButton: {
    alignSelf: "flex-start",
    borderRadius: 8,
  },
  updatedAt: {
    color: "#888",
    marginTop: 4,
  },
  errorText: {
    color: "#FF3B30",
    marginBottom: 16,
  },
});

export default AiModelScreen;
