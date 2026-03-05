import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  Button,
  TextInput,
  Card,
  ActivityIndicator,
  Dialog,
  Portal,
  IconButton,
  Menu,
  Chip,
} from "react-native-paper";
import { useAuth } from "@/hooks/use-auth";
import { fetchIsAdmin } from "@/lib/api";
import { usePromptPlayground } from "@/hooks/use-prompt-playground";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/lib/colors";
import type { Profile } from "@/lib/api";
import type { Recipient } from "@/types/recipient";

const DESKTOP_BREAKPOINT = 768;

const PlaygroundScreen: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

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
          You do not have admin access to the Prompt Playground.
        </Text>
      </View>
    );
  }

  return <PlaygroundContent userId={user.id} isDesktop={isDesktop} />;
};

type PlaygroundContentProps = {
  userId: string;
  isDesktop: boolean;
};

const PlaygroundContent: React.FC<PlaygroundContentProps> = ({
  userId,
  isDesktop,
}) => {
  const playground = usePromptPlayground(userId);
  const [chatInput, setChatInput] = useState("");
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [deployNotes, setDeployNotes] = useState("");
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [giverMenuVisible, setGiverMenuVisible] = useState(false);
  const [recipientMenuVisible, setRecipientMenuVisible] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  function handleSendChat() {
    const msg = chatInput.trim();
    if (!msg || playground.isRefining) return;
    setChatInput("");
    playground.sendRefinementMessage(msg);
  }

  async function handleDeploy() {
    try {
      await playground.deployToProduction(deployNotes);
      setShowDeployDialog(false);
      setDeployNotes("");
    } catch (err) {
      console.error("Deploy error:", err);
    }
  }

  const selectedGiver = playground.profiles.find(
    (p: Profile) => p.id === playground.selectedGiverId
  );
  const selectedRecipient = playground.recipients.find(
    (r: Recipient) => r.id === playground.selectedRecipientId
  );

  const leftColumn = (
    <View style={[styles.column, isDesktop && styles.leftColumn]}>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        Prompt Playground
      </Text>

      {/* Giver selector */}
      <Text variant="labelLarge" style={styles.label}>
        Giver
      </Text>
      <Menu
        visible={giverMenuVisible}
        onDismiss={() => setGiverMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setGiverMenuVisible(true)}
            style={styles.selectorButton}
            contentStyle={styles.selectorContent}
            icon="account"
          >
            {selectedGiver
              ? selectedGiver.full_name || selectedGiver.username || "Unnamed"
              : "Select a giver..."}
          </Button>
        }
        contentStyle={styles.menuContent}
      >
        {playground.profiles.map((profile: Profile) => (
          <Menu.Item
            key={profile.id}
            onPress={() => {
              playground.handleGiverChange(profile.id);
              setGiverMenuVisible(false);
            }}
            title={`${profile.full_name || profile.username || "Unnamed"} (${profile.id.substring(0, 8)})`}
          />
        ))}
      </Menu>

      {/* Recipient selector */}
      <Text variant="labelLarge" style={styles.label}>
        Recipient
      </Text>
      <Menu
        visible={recipientMenuVisible}
        onDismiss={() => setRecipientMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setRecipientMenuVisible(true)}
            disabled={!playground.selectedGiverId}
            style={styles.selectorButton}
            contentStyle={styles.selectorContent}
            icon="account-heart"
          >
            {selectedRecipient
              ? `${selectedRecipient.name} (${selectedRecipient.relationship_type})`
              : "Select a recipient..."}
          </Button>
        }
        contentStyle={styles.menuContent}
      >
        {playground.recipients.map((recipient: Recipient) => (
          <Menu.Item
            key={recipient.id}
            onPress={() => {
              playground.setSelectedRecipientId(recipient.id);
              setRecipientMenuVisible(false);
            }}
            title={`${recipient.name} — ${recipient.relationship_type}`}
          />
        ))}
      </Menu>

      {/* Default prompt (collapsible) */}
      <Button
        mode="text"
        onPress={() => setShowDefaultPrompt(!showDefaultPrompt)}
        icon={showDefaultPrompt ? "chevron-up" : "chevron-down"}
        contentStyle={styles.collapseContent}
        style={styles.collapseButton}
      >
        Default Prompt
      </Button>
      {showDefaultPrompt && (
        <Card style={styles.defaultPromptCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.monoText}>
              {playground.originalPrompt}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Current prompt editor */}
      <Text variant="labelLarge" style={styles.label}>
        Current Prompt
      </Text>
      <TextInput
        mode="outlined"
        multiline
        numberOfLines={12}
        value={playground.currentPrompt}
        onChangeText={playground.setCurrentPrompt}
        style={styles.promptInput}
      />
      <View style={styles.promptActions}>
        <Button
          mode="text"
          onPress={playground.resetPrompt}
          disabled={!playground.hasPromptChanged}
          compact
        >
          Reset to Default
        </Button>
      </View>

      {/* Action buttons */}
      <Button
        mode="contained"
        onPress={playground.generateWithPrompt}
        disabled={
          !playground.selectedRecipientId || playground.isGenerating
        }
        loading={playground.isGenerating}
        style={styles.generateButton}
        icon="auto-fix"
      >
        Generate Gifts
      </Button>

      <Button
        mode="contained"
        onPress={() => setShowDeployDialog(true)}
        disabled={!playground.hasPromptChanged || playground.isDeploying}
        loading={playground.isDeploying}
        style={styles.deployButton}
        buttonColor={Colors.blues.teal}
        icon="rocket-launch"
      >
        Deploy to Production
      </Button>

      <Button
        mode="text"
        onPress={() => {
          // Navigate to version history — use window.location for web
          if (Platform.OS === "web") {
            window.location.href = "/admin/prompts";
          }
        }}
        icon="history"
        compact
      >
        View Version History
      </Button>
    </View>
  );

  const rightColumn = (
    <View style={[styles.column, isDesktop && styles.rightColumn]}>
      {/* Refinement chat */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Prompt Refinement Chat
      </Text>
      <Card style={styles.chatCard}>
        <ScrollView
          ref={chatScrollRef}
          style={styles.chatScroll}
          onContentSizeChange={() =>
            chatScrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {playground.chatMessages.length === 0 && (
            <View style={styles.welcomeMessage}>
              <Text variant="bodyMedium" style={styles.welcomeText}>
                {"Describe how you'd like to change the gift generation prompt. I'll rewrite it for you."}
              </Text>
            </View>
          )}
          {playground.chatMessages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.messageBubble,
                msg.role === "user"
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}
            >
              <Text
                variant="bodyMedium"
                style={
                  msg.role === "user"
                    ? styles.userText
                    : styles.assistantText
                }
              >
                {msg.content}
              </Text>
            </View>
          ))}
          {playground.isRefining && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" />
            </View>
          )}
        </ScrollView>
        <View style={styles.chatInputRow}>
          <TextInput
            mode="outlined"
            placeholder="Describe prompt changes..."
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={handleSendChat}
            style={styles.chatInputField}
            dense
          />
          <IconButton
            icon="send"
            onPress={handleSendChat}
            disabled={!chatInput.trim() || playground.isRefining}
          />
        </View>
      </Card>

      {/* Generation results */}
      {playground.generationResult && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Generation Results
          </Text>
          <GenerationResultView result={playground.generationResult} />
        </>
      )}

      {/* Test run history */}
      <Button
        mode="text"
        onPress={() => setShowHistory(!showHistory)}
        icon={showHistory ? "chevron-up" : "chevron-down"}
        contentStyle={styles.collapseContent}
        style={styles.collapseButton}
      >
        Test Run History ({playground.testRuns.length})
      </Button>
      {showHistory && (
        <View>
          {playground.testRuns.map((run) => (
            <Card
              key={run.id}
              style={styles.historyCard}
              onPress={() => playground.loadTestRun(run)}
            >
              <Card.Content>
                <Text variant="labelSmall">
                  {new Date(run.created_at).toLocaleString()}
                </Text>
                <Text variant="bodySmall" numberOfLines={2}>
                  {run.custom_system_prompt.substring(0, 120)}...
                </Text>
              </Card.Content>
            </Card>
          ))}
          {playground.testRuns.length === 0 && (
            <Text variant="bodySmall" style={styles.emptyText}>
              No test runs yet.
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isDesktop ? (
          <View style={styles.desktopLayout}>
            {leftColumn}
            {rightColumn}
          </View>
        ) : (
          <>
            {leftColumn}
            {rightColumn}
          </>
        )}
      </ScrollView>

      {/* Deploy confirmation dialog */}
      <Portal>
        <Dialog
          visible={showDeployDialog}
          onDismiss={() => setShowDeployDialog(false)}
        >
          <Dialog.Title>Deploy to Production</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogBody}>
              This will deploy a new version of the live gift generation prompt.
              Are you sure?
            </Text>
            <TextInput
              mode="outlined"
              label="Change notes"
              value={deployNotes}
              onChangeText={setDeployNotes}
              multiline
              numberOfLines={3}
              style={styles.deployNotesInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeployDialog(false)}>Cancel</Button>
            <Button
              onPress={handleDeploy}
              disabled={!deployNotes.trim()}
              loading={playground.isDeploying}
            >
              Deploy
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
};

type GenerationResultViewProps = {
  result: Record<string, unknown>;
};

const GenerationResultView: React.FC<GenerationResultViewProps> = ({
  result,
}) => {
  if ("error" in result) {
    return (
      <Card style={styles.resultCard}>
        <Card.Content>
          <Text variant="bodyMedium" style={styles.errorText}>
            Error: {String(result.error)}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  const primary = result.primaryGift as Record<string, string> | undefined;
  const alternatives = (result.alternatives as Record<string, string>[]) || [];

  return (
    <View>
      {primary && (
        <Card style={styles.resultCard}>
          <Card.Content>
            <Chip style={styles.primaryChip}>Primary Gift</Chip>
            <Text variant="titleSmall" style={styles.giftName}>
              {primary.name}
            </Text>
            <Text variant="bodySmall">{primary.description}</Text>
            <Text variant="bodySmall" style={styles.giftMeta}>
              {primary.estimatedPrice} — {primary.retailer}
            </Text>
            {primary.reasoning && (
              <Text variant="bodySmall" style={styles.reasoning}>
                {primary.reasoning}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}
      {alternatives.map((alt, i) => (
        <Card key={i} style={styles.resultCard}>
          <Card.Content>
            <Chip style={styles.altChip}>Alternative {i + 1}</Chip>
            <Text variant="titleSmall" style={styles.giftName}>
              {alt.name}
            </Text>
            <Text variant="bodySmall">{alt.description}</Text>
            <Text variant="bodySmall" style={styles.giftMeta}>
              {alt.estimatedPrice} — {alt.retailer}
            </Text>
            {alt.reasoning && (
              <Text variant="bodySmall" style={styles.reasoning}>
                {alt.reasoning}
              </Text>
            )}
          </Card.Content>
        </Card>
      ))}
      {result.note ? (
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.noteText}>
              {String(result.note)}
            </Text>
          </Card.Content>
        </Card>
      ) : null}
    </View>
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
  desktopLayout: {
    flexDirection: "row",
    gap: 24,
  },
  column: {
    flex: 1,
  },
  leftColumn: {
    flex: 4,
    maxWidth: "40%",
  },
  rightColumn: {
    flex: 6,
    maxWidth: "60%",
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
  },
  selectorButton: {
    marginBottom: 4,
  },
  selectorContent: {
    justifyContent: "flex-start",
  },
  menuContent: {
    maxHeight: 300,
  },
  collapseButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  collapseContent: {
    justifyContent: "flex-start",
  },
  defaultPromptCard: {
    marginBottom: 8,
    backgroundColor: Colors.neutrals.light,
  },
  monoText: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    fontSize: 11,
  },
  promptInput: {
    marginBottom: 4,
    fontSize: 13,
  },
  promptActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  generateButton: {
    marginBottom: 8,
  },
  deployButton: {
    marginBottom: 8,
  },
  // Chat styles
  chatCard: {
    marginBottom: 16,
  },
  chatScroll: {
    maxHeight: 400,
    padding: 12,
  },
  welcomeMessage: {
    padding: 12,
    backgroundColor: Colors.neutrals.light,
    borderRadius: 12,
    marginBottom: 8,
  },
  welcomeText: {
    color: Colors.darks.brown,
    fontStyle: "italic",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#333333",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: Colors.white,
  },
  assistantText: {
    color: "#000000",
  },
  loadingBubble: {
    alignSelf: "flex-start",
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  chatInputField: {
    flex: 1,
  },
  // Results
  resultCard: {
    marginBottom: 8,
  },
  primaryChip: {
    alignSelf: "flex-start",
    marginBottom: 8,
    backgroundColor: Colors.yellows.gold,
  },
  altChip: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  giftName: {
    marginBottom: 4,
  },
  giftMeta: {
    color: Colors.blues.dark,
    marginTop: 4,
  },
  reasoning: {
    color: Colors.darks.brown,
    fontStyle: "italic",
    marginTop: 4,
  },
  errorText: {
    color: Colors.pinks.dark,
  },
  noteText: {
    fontStyle: "italic",
    color: Colors.darks.brown,
  },
  // History
  historyCard: {
    marginBottom: 6,
  },
  emptyText: {
    color: Colors.darks.brown,
    padding: 12,
  },
  dialogBody: {
    marginBottom: 12,
  },
  deployNotesInput: {
    marginTop: 8,
  },
});

export default PlaygroundScreen;
