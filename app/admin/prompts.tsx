import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Platform } from "react-native";
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Dialog,
  Portal,
  Menu,
} from "react-native-paper";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchIsAdmin,
  fetchPromptVersionHistory,
  fetchActiveSystemPrompt,
  rollbackToVersion,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { Colors } from "@/lib/colors";
import { PROMPT_REGISTRY } from "@/lib/prompt-registry";
import type { SystemPromptVersion } from "@/lib/api";
import type { PromptDefinition } from "@/lib/prompt-registry";

const PromptsScreen: React.FC = () => {
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
          You do not have admin access to prompt management.
        </Text>
      </View>
    );
  }

  return <PromptsContent />;
};

const PromptsContent: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedPromptKey, setSelectedPromptKey] = useState(
    "gift_generation_system"
  );
  const [promptMenuVisible, setPromptMenuVisible] = useState(false);
  const [rollbackTarget, setRollbackTarget] =
    useState<SystemPromptVersion | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(
    null
  );

  const selectedDef = PROMPT_REGISTRY.find((p) => p.key === selectedPromptKey);

  const activeQuery = useQuery({
    queryKey: queryKeys.activeSystemPrompt(selectedPromptKey),
    queryFn: () => fetchActiveSystemPrompt(selectedPromptKey),
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.promptVersionHistory(selectedPromptKey),
    queryFn: () => fetchPromptVersionHistory(selectedPromptKey),
  });

  async function handleRollback() {
    if (!rollbackTarget) return;
    setIsRollingBack(true);
    try {
      await rollbackToVersion(rollbackTarget.id, selectedPromptKey);
      queryClient.invalidateQueries({
        queryKey: queryKeys.activeSystemPrompt(selectedPromptKey),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.promptVersionHistory(selectedPromptKey),
      });
      setRollbackTarget(null);
    } catch (err) {
      console.error("Rollback error:", err);
    } finally {
      setIsRollingBack(false);
    }
  }

  const versions = historyQuery.data || [];
  const active = activeQuery.data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text variant="headlineSmall">Prompt Versions</Text>
          <Menu
            visible={promptMenuVisible}
            onDismiss={() => setPromptMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setPromptMenuVisible(true)}
                icon="swap-horizontal"
                compact
              >
                {selectedDef?.label ?? "Select Prompt"}
              </Button>
            }
            contentStyle={styles.promptMenuContent}
          >
            {PROMPT_REGISTRY.map((def: PromptDefinition) => (
              <Menu.Item
                key={def.key}
                onPress={() => {
                  setSelectedPromptKey(def.key);
                  setPromptMenuVisible(false);
                  setExpandedVersionId(null);
                }}
                title={def.label}
                leadingIcon={
                  def.key === selectedPromptKey ? "check" : undefined
                }
              />
            ))}
          </Menu>
        </View>
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

      {/* Active version */}
      {active && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Active Version
          </Text>
          <Card style={styles.activeCard}>
            <Card.Content>
              <View style={styles.versionHeader}>
                <Text variant="titleSmall">Version {active.version}</Text>
                <Text variant="labelSmall" style={styles.activeLabel}>
                  ACTIVE
                </Text>
              </View>
              {active.change_notes && (
                <Text variant="bodySmall" style={styles.changeNotes}>
                  {active.change_notes}
                </Text>
              )}
              <Text variant="bodySmall" style={styles.date}>
                {new Date(active.created_at).toLocaleString()}
              </Text>
              <Text
                variant="bodySmall"
                style={styles.promptPreview}
                numberOfLines={expandedVersionId === active.id ? undefined : 6}
              >
                {active.prompt_text}
              </Text>
              <Button
                mode="text"
                onPress={() =>
                  setExpandedVersionId(
                    expandedVersionId === active.id ? null : active.id
                  )
                }
                compact
              >
                {expandedVersionId === active.id
                  ? "Show less"
                  : "Show full prompt"}
              </Button>
            </Card.Content>
          </Card>
        </>
      )}

      {/* Version history */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Version History
      </Text>
      {historyQuery.isLoading && <ActivityIndicator />}
      {versions.map((version: SystemPromptVersion) => (
        <Card
          key={version.id}
          style={[
            styles.versionCard,
            version.is_active && styles.activeVersionCard,
          ]}
        >
          <Card.Content>
            <View style={styles.versionHeader}>
              <Text variant="titleSmall">Version {version.version}</Text>
              {version.is_active && (
                <Text variant="labelSmall" style={styles.activeLabel}>
                  ACTIVE
                </Text>
              )}
            </View>
            {version.change_notes && (
              <Text variant="bodySmall" style={styles.changeNotes}>
                {version.change_notes}
              </Text>
            )}
            <Text variant="bodySmall" style={styles.date}>
              {new Date(version.created_at).toLocaleString()}
            </Text>
            <Text
              variant="bodySmall"
              style={styles.promptPreview}
              numberOfLines={
                expandedVersionId === version.id ? undefined : 3
              }
            >
              {version.prompt_text}
            </Text>
            <View style={styles.versionActions}>
              <Button
                mode="text"
                onPress={() =>
                  setExpandedVersionId(
                    expandedVersionId === version.id ? null : version.id
                  )
                }
                compact
              >
                {expandedVersionId === version.id
                  ? "Show less"
                  : "Expand"}
              </Button>
              {!version.is_active && (
                <Button
                  mode="outlined"
                  onPress={() => setRollbackTarget(version)}
                  compact
                >
                  Rollback to this version
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>
      ))}
      {versions.length === 0 && !historyQuery.isLoading && (
        <Text variant="bodyMedium" style={styles.emptyText}>
          No prompt versions found.
        </Text>
      )}

      {/* Rollback confirmation dialog */}
      <Portal>
        <Dialog
          visible={!!rollbackTarget}
          onDismiss={() => setRollbackTarget(null)}
        >
          <Dialog.Title>Rollback Prompt</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to rollback to version{" "}
              {rollbackTarget?.version}? This will make it the active production
              prompt.
            </Text>
            {rollbackTarget?.change_notes && (
              <Text variant="bodySmall" style={styles.rollbackNotes}>
                Notes: {rollbackTarget.change_notes}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRollbackTarget(null)}>Cancel</Button>
            <Button onPress={handleRollback} loading={isRollingBack}>
              Rollback
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  promptMenuContent: {
    maxHeight: 300,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  activeCard: {
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.blues.teal,
  },
  versionCard: {
    marginBottom: 8,
  },
  activeVersionCard: {
    borderWidth: 1,
    borderColor: Colors.blues.teal,
  },
  versionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  activeLabel: {
    color: Colors.blues.teal,
    fontWeight: "bold",
  },
  changeNotes: {
    color: Colors.darks.brown,
    marginBottom: 4,
  },
  date: {
    color: "#888",
    marginBottom: 8,
  },
  promptPreview: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    fontSize: 11,
    backgroundColor: Colors.neutrals.light,
    padding: 8,
    borderRadius: 4,
  },
  versionActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  emptyText: {
    color: Colors.darks.brown,
    padding: 12,
  },
  rollbackNotes: {
    marginTop: 8,
    fontStyle: "italic",
    color: Colors.darks.brown,
  },
});

export default PromptsScreen;
