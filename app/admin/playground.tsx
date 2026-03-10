import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Linking,
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
  Divider,
  Badge,
} from "react-native-paper";
import { useAuth } from "@/hooks/use-auth";
import { fetchIsAdmin } from "@/lib/api";
import { usePromptPlayground } from "@/hooks/use-prompt-playground";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/lib/colors";
import type { Profile } from "@/lib/api";
import type { Recipient } from "@/types/recipient";

const DESKTOP_BREAKPOINT = 900;

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
  const [showCisPanel, setShowCisPanel] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [giverMenuVisible, setGiverMenuVisible] = useState(false);
  const [recipientMenuVisible, setRecipientMenuVisible] = useState(false);
  const [addingInterest, setAddingInterest] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [addingAvoid, setAddingAvoid] = useState(false);
  const [newAvoid, setNewAvoid] = useState("");
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

  // Editable CIS helpers
  const cis = playground.editedCis;

  function handleRemoveInterest(index: number) {
    const current = cis?.recipient.interests || [];
    const updated = current.filter((_, i) => i !== index);
    playground.setCisField("recipient", "interests", updated);
  }

  function handleAddInterest() {
    const val = newInterest.trim();
    if (!val) return;
    const current = cis?.recipient.interests || [];
    playground.setCisField("recipient", "interests", [...current, val]);
    setNewInterest("");
    setAddingInterest(false);
  }

  function handleRemoveAvoid(index: number) {
    const current = cis?.history.avoid || [];
    const updated = current.filter((_, i) => i !== index);
    playground.setCisField("history", "avoid", updated);
  }

  function handleAddAvoid() {
    const val = newAvoid.trim();
    if (!val) return;
    const current = cis?.history.avoid || [];
    playground.setCisField("history", "avoid", [...current, val]);
    setNewAvoid("");
    setAddingAvoid(false);
  }

  function handleRemovePriorGift(index: number) {
    const current = cis?.history.prior_gifts || [];
    const updated = current.filter((_, i) => i !== index);
    playground.setCisField("history", "prior_gifts", updated);
  }

  function sectionHasEdits(section: string) {
    return !!(playground.cisEdits as Record<string, unknown>)[section];
  }

  // --- Header with title + actions ---
  const header = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Prompt Playground
        </Text>
        <Button
          mode="text"
          onPress={() => {
            if (Platform.OS === "web") {
              window.location.href = "/admin/prompts";
            }
          }}
          icon="history"
          compact
          style={styles.historyLink}
        >
          Version History
        </Button>
      </View>
      <View style={styles.headerActions}>
        <Button
          mode="contained"
          onPress={playground.generateWithPrompt}
          disabled={!playground.selectedRecipientId || playground.isGenerating}
          loading={playground.isGenerating}
          icon="auto-fix"
          style={styles.headerButton}
        >
          Generate
        </Button>
        <Button
          mode="contained"
          onPress={() => setShowDeployDialog(true)}
          disabled={!playground.hasPromptChanged || playground.isDeploying}
          loading={playground.isDeploying}
          buttonColor={Colors.blues.teal}
          icon="rocket-launch"
          style={styles.headerButton}
        >
          Deploy
        </Button>
      </View>
    </View>
  );

  // --- Context panel: selectors + editable CIS ---
  const contextPanel = (
    <View style={[styles.panel, isDesktop && styles.contextPanelDesktop]}>
      {/* Selectors card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.cardTitle}>
            Test Context
          </Text>
          <Text variant="labelMedium" style={styles.fieldLabel}>
            Giver
          </Text>
          <Menu
            visible={giverMenuVisible}
            onDismiss={() => setGiverMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setGiverMenuVisible(true)}
                style={styles.selector}
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

          <Text variant="labelMedium" style={styles.fieldLabel}>
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
                style={styles.selector}
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
        </Card.Content>
      </Card>

      {/* Editable CIS card */}
      {playground.selectedRecipientId && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardTitleRow}>
              <View style={styles.cisTitleGroup}>
                <Text variant="titleSmall" style={styles.cardTitle}>
                  CIS Data
                </Text>
                {playground.hasCisEdits && (
                  <Badge size={8} style={styles.editedBadgeTitle} />
                )}
              </View>
              <View style={styles.cisHeaderActions}>
                {playground.hasCisEdits && (
                  <Button
                    mode="text"
                    onPress={playground.resetCisEdits}
                    compact
                    icon="refresh"
                  >
                    Reset
                  </Button>
                )}
                <IconButton
                  icon={showCisPanel ? "chevron-up" : "chevron-down"}
                  size={18}
                  onPress={() => setShowCisPanel(!showCisPanel)}
                  style={styles.collapseIcon}
                />
              </View>
            </View>
            {showCisPanel && (
              <>
                {playground.isLoadingCis ? (
                  <ActivityIndicator size="small" style={styles.cisLoading} />
                ) : cis ? (
                  <View style={styles.cisSections}>
                    {/* Giver section */}
                    <EditableCISSection label="Giver" hasEdits={sectionHasEdits("giver")}>
                      <TextInput
                        mode="outlined"
                        label="Name"
                        value={cis.giver.name}
                        onChangeText={(v) => playground.setCisField("giver", "name", v)}
                        dense
                        style={styles.cisInput}
                        outlineStyle={styles.cisInputOutline}
                      />
                      <TextInput
                        mode="outlined"
                        label="Tone"
                        value={cis.giver.tone}
                        onChangeText={(v) => playground.setCisField("giver", "tone", v)}
                        dense
                        style={styles.cisInput}
                        outlineStyle={styles.cisInputOutline}
                      />
                      <TextInput
                        mode="outlined"
                        label="Spending"
                        value={cis.giver.spending_tendencies}
                        onChangeText={(v) => playground.setCisField("giver", "spending_tendencies", v)}
                        dense
                        style={styles.cisInput}
                        outlineStyle={styles.cisInputOutline}
                      />
                    </EditableCISSection>

                    <Divider style={styles.cisDivider} />

                    {/* Recipient section */}
                    <EditableCISSection label="Recipient" hasEdits={sectionHasEdits("recipient")}>
                      <TextInput
                        mode="outlined"
                        label="Name"
                        value={cis.recipient.name}
                        onChangeText={(v) => playground.setCisField("recipient", "name", v)}
                        dense
                        style={styles.cisInput}
                        outlineStyle={styles.cisInputOutline}
                      />
                      <View style={styles.cisInputRow}>
                        <TextInput
                          mode="outlined"
                          label="Relationship"
                          value={cis.recipient.relationship}
                          onChangeText={(v) => playground.setCisField("recipient", "relationship", v)}
                          dense
                          style={[styles.cisInput, styles.cisInputFlex]}
                          outlineStyle={styles.cisInputOutline}
                        />
                        <TextInput
                          mode="outlined"
                          label="Age"
                          value={cis.recipient.age != null ? String(cis.recipient.age) : ""}
                          onChangeText={(v) => playground.setCisField("recipient", "age", v ? Number(v) : undefined)}
                          dense
                          keyboardType="numeric"
                          style={[styles.cisInput, { width: 70 }]}
                          outlineStyle={styles.cisInputOutline}
                        />
                      </View>
                      <TextInput
                        mode="outlined"
                        label="Location"
                        value={cis.recipient.location || ""}
                        onChangeText={(v) => playground.setCisField("recipient", "location", v || undefined)}
                        dense
                        style={styles.cisInput}
                        outlineStyle={styles.cisInputOutline}
                      />
                      <Text variant="labelSmall" style={styles.cisFieldLabel}>
                        Interests
                      </Text>
                      <View style={styles.cisChipRow}>
                        {(cis.recipient.interests || []).map((interest, i) => (
                          <Chip
                            key={i}
                            compact
                            style={styles.cisInterestChip}
                            onClose={() => handleRemoveInterest(i)}
                          >
                            {interest}
                          </Chip>
                        ))}
                        {addingInterest ? (
                          <View style={styles.inlineAddRow}>
                            <TextInput
                              mode="outlined"
                              value={newInterest}
                              onChangeText={setNewInterest}
                              onSubmitEditing={handleAddInterest}
                              placeholder="Add..."
                              dense
                              style={styles.inlineAddInput}
                              outlineStyle={styles.cisInputOutline}
                              autoFocus
                            />
                            <IconButton icon="check" size={16} onPress={handleAddInterest} />
                            <IconButton icon="close" size={16} onPress={() => { setAddingInterest(false); setNewInterest(""); }} />
                          </View>
                        ) : (
                          <Chip
                            compact
                            icon="plus"
                            style={styles.addChip}
                            onPress={() => setAddingInterest(true)}
                          >
                            Add
                          </Chip>
                        )}
                      </View>
                      <TextInput
                        mode="outlined"
                        label="Aesthetic"
                        value={(cis.recipient.aesthetic || []).join(", ")}
                        onChangeText={(v) => playground.setCisField("recipient", "aesthetic", v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])}
                        dense
                        style={styles.cisInput}
                        outlineStyle={styles.cisInputOutline}
                      />
                    </EditableCISSection>

                    <Divider style={styles.cisDivider} />

                    {/* Occasion section */}
                    <EditableCISSection label="Occasion" hasEdits={sectionHasEdits("occasion")}>
                      <View style={styles.cisInputRow}>
                        <TextInput
                          mode="outlined"
                          label="Type"
                          value={cis.occasion.type}
                          onChangeText={(v) => playground.setCisField("occasion", "type", v)}
                          dense
                          style={[styles.cisInput, styles.cisInputFlex]}
                          outlineStyle={styles.cisInputOutline}
                        />
                        <TextInput
                          mode="outlined"
                          label="Budget $"
                          value={cis.occasion.budget_usd != null ? String(cis.occasion.budget_usd) : ""}
                          onChangeText={(v) => playground.setCisField("occasion", "budget_usd", v ? Number(v) : undefined)}
                          dense
                          keyboardType="numeric"
                          style={[styles.cisInput, { width: 90 }]}
                          outlineStyle={styles.cisInputOutline}
                        />
                      </View>
                      <TextInput
                        mode="outlined"
                        label="Date"
                        value={cis.occasion.date}
                        onChangeText={(v) => playground.setCisField("occasion", "date", v)}
                        dense
                        style={styles.cisInput}
                        outlineStyle={styles.cisInputOutline}
                      />
                      <TextInput
                        mode="outlined"
                        label="Significance"
                        value={cis.occasion.significance || ""}
                        onChangeText={(v) => playground.setCisField("occasion", "significance", v || undefined)}
                        dense
                        style={styles.cisInput}
                        outlineStyle={styles.cisInputOutline}
                      />
                    </EditableCISSection>

                    <Divider style={styles.cisDivider} />

                    {/* History section */}
                    <EditableCISSection label="History" hasEdits={sectionHasEdits("history")}>
                      {cis.history.prior_gifts.length > 0 ? (
                        cis.history.prior_gifts.map((gift, i) => (
                          <View key={i} style={styles.priorGiftRow}>
                            <Text variant="bodySmall" style={styles.priorGiftText}>
                              {gift.name}{gift.reaction ? ` — ${gift.reaction}` : ""}
                            </Text>
                            <IconButton
                              icon="close"
                              size={14}
                              onPress={() => handleRemovePriorGift(i)}
                              style={styles.removeGiftButton}
                            />
                          </View>
                        ))
                      ) : (
                        <Text variant="bodySmall" style={styles.cisSecondary}>
                          No prior gifts
                        </Text>
                      )}
                      <Text variant="labelSmall" style={styles.cisFieldLabel}>
                        Avoid
                      </Text>
                      <View style={styles.cisChipRow}>
                        {(cis.history.avoid || []).map((item, i) => (
                          <Chip
                            key={i}
                            compact
                            style={styles.cisAvoidChip}
                            onClose={() => handleRemoveAvoid(i)}
                          >
                            {item}
                          </Chip>
                        ))}
                        {addingAvoid ? (
                          <View style={styles.inlineAddRow}>
                            <TextInput
                              mode="outlined"
                              value={newAvoid}
                              onChangeText={setNewAvoid}
                              onSubmitEditing={handleAddAvoid}
                              placeholder="Add..."
                              dense
                              style={styles.inlineAddInput}
                              outlineStyle={styles.cisInputOutline}
                              autoFocus
                            />
                            <IconButton icon="check" size={16} onPress={handleAddAvoid} />
                            <IconButton icon="close" size={16} onPress={() => { setAddingAvoid(false); setNewAvoid(""); }} />
                          </View>
                        ) : (
                          <Chip
                            compact
                            icon="plus"
                            style={styles.addChip}
                            onPress={() => setAddingAvoid(true)}
                          >
                            Add
                          </Chip>
                        )}
                      </View>
                    </EditableCISSection>
                  </View>
                ) : (
                  <Text variant="bodySmall" style={styles.cisSecondary}>
                    Failed to load CIS data.
                  </Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>
      )}
    </View>
  );

  // --- Prompt editor panel ---
  const promptPanel = (
    <View style={[styles.panel, isDesktop && styles.promptPanelDesktop]}>
      <Card style={[styles.card, styles.promptCard]}>
        <Card.Content>
          <View style={styles.cardTitleRow}>
            <Text variant="titleSmall" style={styles.cardTitle}>
              System Prompt
            </Text>
            <View style={styles.promptBadges}>
              {playground.hasPromptChanged && (
                <Chip compact style={styles.modifiedBadge}>
                  Modified
                </Chip>
              )}
              <Button
                mode="text"
                onPress={playground.resetPrompt}
                disabled={!playground.hasPromptChanged}
                compact
              >
                Reset
              </Button>
            </View>
          </View>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={isDesktop ? 20 : 12}
            value={playground.currentPrompt}
            onChangeText={playground.setCurrentPrompt}
            style={styles.promptInput}
            contentStyle={styles.promptInputContent}
            outlineStyle={styles.promptOutline}
          />

          {/* Default prompt collapsible */}
          <Button
            mode="text"
            onPress={() => setShowDefaultPrompt(!showDefaultPrompt)}
            icon={showDefaultPrompt ? "chevron-up" : "chevron-down"}
            contentStyle={styles.collapseContent}
            style={styles.defaultPromptToggle}
            compact
          >
            Active Production Prompt
          </Button>
          {showDefaultPrompt && (
            <View style={styles.defaultPromptBox}>
              <Text variant="bodySmall" style={styles.monoText}>
                {playground.originalPrompt}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Refinement chat */}
      <Card style={styles.card}>
        <Card.Content style={styles.chatCardContent}>
          <Text variant="titleSmall" style={styles.cardTitle}>
            Refinement Chat
          </Text>
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScroll}
            onContentSizeChange={() =>
              chatScrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {playground.chatMessages.length === 0 && (
              <View style={styles.welcomeMessage}>
                <Text variant="bodySmall" style={styles.welcomeText}>
                  {"Describe how you'd like to change the prompt. AI will rewrite it for you."}
                </Text>
              </View>
            )}
            {playground.chatMessages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.messageBubble,
                  msg.role === "user" ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text
                  variant="bodySmall"
                  style={msg.role === "user" ? styles.userText : styles.assistantText}
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
        </Card.Content>
      </Card>
    </View>
  );

  // --- Results panel ---
  const resultsPanel = (
    <View style={[styles.panel, isDesktop && styles.resultsPanelDesktop]}>
      {/* Generation results */}
      {playground.generationResult ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.cardTitle}>
              Generation Results
            </Text>
            <GenerationResultView result={playground.generationResult} />
          </Card.Content>
        </Card>
      ) : (
        <Card style={[styles.card, styles.emptyResultsCard]}>
          <Card.Content style={styles.emptyResultsContent}>
            <Text variant="bodyMedium" style={styles.emptyResultsText}>
              Select a giver and recipient, then click Generate to see results here.
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Test run history */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardTitleRow}>
            <Text variant="titleSmall" style={styles.cardTitle}>
              Test Runs ({playground.testRuns.length})
            </Text>
            <IconButton
              icon={showHistory ? "chevron-up" : "chevron-down"}
              size={18}
              onPress={() => setShowHistory(!showHistory)}
              style={styles.collapseIcon}
            />
          </View>
          {showHistory && (
            <View style={styles.historyList}>
              {playground.testRuns.map((run) => (
                <Card
                  key={run.id}
                  style={styles.historyItem}
                  onPress={() => playground.loadTestRun(run)}
                >
                  <Card.Content style={styles.historyItemContent}>
                    <Text variant="labelSmall" style={styles.historyDate}>
                      {new Date(run.created_at).toLocaleString()}
                    </Text>
                    <Text variant="bodySmall" numberOfLines={2} style={styles.historyPreview}>
                      {run.custom_system_prompt.substring(0, 100)}...
                    </Text>
                  </Card.Content>
                </Card>
              ))}
              {playground.testRuns.length === 0 && (
                <Text variant="bodySmall" style={styles.cisSecondary}>
                  No test runs yet.
                </Text>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.maxWidth}>
          {header}
          {isDesktop ? (
            <View style={styles.desktopLayout}>
              {contextPanel}
              {promptPanel}
              {resultsPanel}
            </View>
          ) : (
            <>
              {contextPanel}
              {promptPanel}
              {resultsPanel}
            </>
          )}
        </View>
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
              This will update the live gift generation prompt. Are you sure?
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

// --- Small helper components ---

type EditableCISSectionProps = {
  label: string;
  hasEdits: boolean;
  children: React.ReactNode;
};

const EditableCISSection: React.FC<EditableCISSectionProps> = ({ label, hasEdits, children }) => (
  <View style={styles.cisSection}>
    <View style={styles.cisSectionHeader}>
      <Text variant="labelSmall" style={styles.cisSectionLabel}>
        {label}
      </Text>
      {hasEdits && <Badge size={8} style={styles.editedBadge} />}
    </View>
    {children}
  </View>
);

type GenerationResultViewProps = {
  result: Record<string, unknown>;
};

type Suggestion = {
  name: string;
  retailer: string;
  url: string;
  price_usd: number;
  category: string;
  tags: string[];
  reason: string;
  image_url?: string;
};

const GenerationResultView: React.FC<GenerationResultViewProps> = ({
  result,
}) => {
  if ("error" in result) {
    return (
      <View style={styles.resultError}>
        <Text variant="bodyMedium" style={styles.errorText}>
          {String(result.error)}
        </Text>
      </View>
    );
  }

  const suggestions = (result.suggestions as Suggestion[]) || [];

  if (suggestions.length === 0) {
    return <Text variant="bodyMedium">No suggestions generated.</Text>;
  }

  return (
    <View style={styles.suggestionsList}>
      {suggestions.map((suggestion, i) => (
        <View key={i} style={styles.suggestionItem}>
          <View style={styles.suggestionHeader}>
            <Chip compact style={i === 0 ? styles.primaryChip : styles.altChip}>
              {i === 0 ? "Top Pick" : `#${i + 1}`}
            </Chip>
            {suggestion.url && (
              <IconButton
                icon="open-in-new"
                size={16}
                onPress={() => Linking.openURL(suggestion.url)}
                style={styles.suggestionLink}
              />
            )}
          </View>
          <Text variant="titleSmall">{suggestion.name}</Text>
          <Text variant="bodySmall" style={styles.suggestionMeta}>
            ${suggestion.price_usd} — {suggestion.retailer}
          </Text>
          {suggestion.reason && (
            <Text variant="bodySmall" style={styles.suggestionReason}>
              {suggestion.reason}
            </Text>
          )}
          {suggestion.category && (
            <View style={styles.suggestionTags}>
              <Chip compact style={styles.categoryChip}>
                {suggestion.category}
              </Chip>
              {suggestion.tags?.map((tag, j) => (
                <Chip key={j} compact style={styles.tagChip}>
                  {tag}
                </Chip>
              ))}
            </View>
          )}
          {i < suggestions.length - 1 && <Divider style={styles.suggestionDivider} />}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  maxWidth: {
    maxWidth: 1400,
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontWeight: "700",
  },
  historyLink: {
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    borderRadius: 8,
  },

  // Layout
  desktopLayout: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  panel: {
    gap: 12,
  },
  contextPanelDesktop: {
    width: 300,
    minWidth: 300,
  },
  promptPanelDesktop: {
    flex: 1,
  },
  resultsPanelDesktop: {
    width: 360,
    minWidth: 320,
  },

  // Cards
  card: {
    borderRadius: 12,
    backgroundColor: Colors.white,
    elevation: 1,
  },
  cardTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  collapseIcon: {
    margin: 0,
  },

  // Selectors
  fieldLabel: {
    marginTop: 8,
    marginBottom: 4,
    color: Colors.darks.brown,
  },
  selector: {
    borderRadius: 8,
  },
  selectorContent: {
    justifyContent: "flex-start",
  },
  menuContent: {
    maxHeight: 300,
  },

  // CIS Editable
  cisTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cisHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editedBadgeTitle: {
    backgroundColor: Colors.yellows.amber,
  },
  cisLoading: {
    padding: 20,
  },
  cisSections: {
    gap: 0,
  },
  cisDivider: {
    marginVertical: 6,
  },
  cisSection: {
    paddingVertical: 4,
  },
  cisSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cisSectionLabel: {
    color: Colors.darks.brown,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 10,
  },
  editedBadge: {
    backgroundColor: Colors.yellows.amber,
  },
  cisSecondary: {
    color: Colors.darks.brown,
    fontStyle: "italic",
  },
  cisInput: {
    backgroundColor: Colors.white,
    marginBottom: 4,
    fontSize: 12,
  },
  cisInputOutline: {
    borderRadius: 6,
  },
  cisInputRow: {
    flexDirection: "row",
    gap: 6,
  },
  cisInputFlex: {
    flex: 1,
  },
  cisFieldLabel: {
    color: Colors.darks.brown,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  cisChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  cisInterestChip: {
    backgroundColor: "#e8f4f8",
  },
  cisAvoidChip: {
    backgroundColor: "#fce4ec",
  },
  addChip: {
    backgroundColor: "#f0f0f0",
    borderStyle: "dashed",
  },
  inlineAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  inlineAddInput: {
    width: 100,
    backgroundColor: Colors.white,
    fontSize: 12,
  },
  priorGiftRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priorGiftText: {
    flex: 1,
  },
  removeGiftButton: {
    margin: 0,
  },

  // Prompt editor
  promptCard: {
    flex: 1,
  },
  promptBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modifiedBadge: {
    backgroundColor: Colors.yellows.amber,
    height: 26,
  },
  promptInput: {
    fontSize: 13,
    backgroundColor: Colors.white,
  },
  promptOutline: {
    borderRadius: 6,
  },
  promptInputContent: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    fontSize: 12,
  },
  defaultPromptToggle: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  collapseContent: {
    justifyContent: "flex-start",
  },
  defaultPromptBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  monoText: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    fontSize: 11,
    color: Colors.darks.brown,
  },

  // Chat
  chatCardContent: {
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  chatScroll: {
    maxHeight: 250,
    paddingHorizontal: 16,
  },
  welcomeMessage: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginBottom: 8,
  },
  welcomeText: {
    color: Colors.darks.brown,
    fontStyle: "italic",
  },
  messageBubble: {
    maxWidth: "85%",
    padding: 10,
    borderRadius: 14,
    marginBottom: 6,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: Colors.darks.black,
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
    color: Colors.darks.black,
  },
  loadingBubble: {
    alignSelf: "flex-start",
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 14,
    borderBottomLeftRadius: 4,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
  },
  chatInputField: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // Results
  emptyResultsCard: {
    minHeight: 120,
  },
  emptyResultsContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyResultsText: {
    color: Colors.darks.brown,
    textAlign: "center",
  },
  resultError: {
    padding: 12,
    backgroundColor: "#fce4ec",
    borderRadius: 8,
  },
  errorText: {
    color: Colors.pinks.dark,
  },
  suggestionsList: {
    gap: 0,
  },
  suggestionItem: {
    paddingVertical: 8,
  },
  suggestionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  suggestionLink: {
    margin: 0,
  },
  suggestionMeta: {
    color: Colors.blues.dark,
    marginTop: 2,
  },
  suggestionReason: {
    color: Colors.darks.brown,
    fontStyle: "italic",
    marginTop: 4,
  },
  suggestionTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  suggestionDivider: {
    marginTop: 12,
  },
  primaryChip: {
    backgroundColor: Colors.yellows.gold,
  },
  altChip: {
    backgroundColor: Colors.neutrals.light,
  },
  categoryChip: {
    backgroundColor: Colors.neutrals.light,
  },
  tagChip: {
    backgroundColor: "#f0f0f0",
  },

  // History
  historyList: {
    gap: 6,
  },
  historyItem: {
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  historyItemContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  historyDate: {
    color: Colors.darks.brown,
    marginBottom: 2,
  },
  historyPreview: {
    color: "#555",
  },

  // Dialog
  dialogBody: {
    marginBottom: 12,
  },
  deployNotesInput: {
    marginTop: 8,
  },
});

export default PlaygroundScreen;
