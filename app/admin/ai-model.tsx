import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { useAppConfig, useUpdateAppConfig } from "@/hooks/use-app-config";
import type { Provider } from "@/lib/ai-models";
import { PROVIDER_MODELS } from "@/lib/ai-models";
import { Colors } from "@/lib/colors";
import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  Menu,
  SegmentedButtons,
  Text,
} from "react-native-paper";

// Admin gating (loading / Access Denied) lives in app/admin/_layout.tsx.
const AiModelScreen: React.FC = () => {
  const configQuery = useAppConfig();
  const updateConfig = useUpdateAppConfig();
  const [modelMenuVisible, setModelMenuVisible] = useState(false);

  const config = configQuery.data;
  const isPending = updateConfig.isPending;

  function selectProvider(provider: Provider) {
    if (!config) return;
    updateConfig.mutate({
      ai_provider: provider,
      ai_model: PROVIDER_MODELS[provider][0],
    });
  }

  function selectModel(model: string) {
    if (!config) return;
    updateConfig.mutate({ ai_model: model });
    setModelMenuVisible(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
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
                {
                  value: "anthropic",
                  label: "Claude",
                  showSelectedCheck: false,
                },
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
