import React, { useState, useRef, useEffect } from "react";
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
  Switch,
} from "react-native-paper";
import { useAuth } from "@/hooks/use-auth";
import { fetchIsAdmin } from "@/lib/api";
import { usePromptPlayground } from "@/hooks/use-prompt-playground";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/lib/colors";
import type { Profile } from "@/lib/api";
import type { Recipient } from "@/types/recipient";
import type { PromptDefinition } from "@/lib/prompt-registry";

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
  const [promptMenuVisible, setPromptMenuVisible] = useState(false);
  const [addingInterest, setAddingInterest] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [addingAvoid, setAddingAvoid] = useState(false);
  const [newAvoid, setNewAvoid] = useState("");
  const [showProductionContext, setShowProductionContext] = useState(false);
  const [testMessageInput, setTestMessageInput] = useState("");
  const chatScrollRef = useRef<ScrollView>(null);

  const conversationScrollRef = useRef<ScrollView>(null);

  function handleSendChat() {
    const msg = chatInput.trim();
    if (!msg || playground.isRefining) return;
    setChatInput("");
    playground.sendRefinementMessage(msg);
  }

  function handleSendConversationMessage() {
    const msg = testMessageInput.trim();
    if (!msg || playground.isConversationLoading) return;
    setTestMessageInput("");
    playground.sendConversationMessage(msg);
  }

  // Auto-generate the first LLM message when conversation prompt is selected
  useEffect(() => {
    if (
      playground.selectedPromptKey === "add_recipient_conversation" &&
      playground.testMessages.length === 0
    ) {
      playground.startConversation();
    }
  }, [playground.selectedPromptKey]);

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


  // --- Header with title + prompt selector + actions ---
  const header = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Prompt Playground
        </Text>
        <Menu
          visible={promptMenuVisible}
          onDismiss={() => setPromptMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setPromptMenuVisible(true)}
              icon="swap-horizontal"
              style={styles.promptSelector}
              contentStyle={styles.selectorContent}
            >
              {playground.selectedPromptDef?.label ?? "Select Prompt"}
            </Button>
          }
          contentStyle={styles.menuContent}
        >
          {playground.promptRegistry.map((def: PromptDefinition) => (
            <Menu.Item
              key={def.key}
              onPress={() => {
                playground.setSelectedPromptKey(def.key);
                setPromptMenuVisible(false);
              }}
              title={def.label}
              description={def.description}
              leadingIcon={
                def.key === playground.selectedPromptKey
                  ? "check"
                  : undefined
              }
            />
          ))}
        </Menu>
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
          disabled={!playground.canGenerate}
          loading={playground.isGenerating}
          icon="auto-fix"
          style={styles.headerButton}
        >
          {playground.isGiftGeneration ? "Generate" : "Test"}
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

  // --- Context panel: differs by prompt type ---
  const contextPanel = playground.isGiftGeneration ? (
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

      {/* Simulate cron toggle */}
      {playground.selectedRecipientId && (
        <Card style={styles.card}>
          <Card.Content style={styles.cronToggleRow}>
            <View>
              <Text variant="labelLarge">Simulate Cron</Text>
              <Text variant="bodySmall" style={styles.cronToggleHint}>
                Include existing suggestions as avoid list
              </Text>
            </View>
            <Switch
              value={playground.simulateCron}
              onValueChange={playground.setSimulateCron}
            />
          </Card.Content>
        </Card>
      )}

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
                        label="Gifting Summary"
                        value={cis.giver.gifting_summary ?? ""}
                        onChangeText={(v) => playground.setCisField("giver", "gifting_summary", v)}
                        dense
                        style={styles.cisInput}
                        outlineStyle={styles.cisInputOutline}
                        multiline
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
  ) : (
    // Non-gift prompt context panel
    <View style={[styles.panel, isDesktop && styles.contextPanelDesktop]}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.cardTitle}>
            {playground.selectedPromptDef?.label}
          </Text>
          <Text variant="bodySmall" style={styles.promptDescription}>
            {playground.selectedPromptDef?.description}
          </Text>

          {/* Template variables */}
          {(playground.selectedPromptDef?.templateVariables.length ?? 0) > 0 && (
            <View style={styles.templateVarsSection}>
              <Text variant="labelSmall" style={styles.cisFieldLabel}>
                Variables available at runtime
              </Text>
              <View style={styles.cisChipRow}>
                {playground.selectedPromptDef?.templateVariables.map((v) => (
                  <Chip key={v} compact style={styles.templateVarChip}>
                    {`{{${v}}}`}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Test input panels by prompt type */}
      {playground.selectedPromptKey === "add_recipient_conversation" && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardTitleRow}>
              <Text variant="titleSmall" style={styles.cardTitle}>
                Conversation Test
              </Text>
              {playground.testMessages.length > 0 && (
                <Button
                  mode="text"
                  onPress={playground.clearTestMessages}
                  compact
                  icon="delete"
                >
                  Reset
                </Button>
              )}
            </View>

            <ScrollView
              ref={conversationScrollRef}
              style={styles.conversationScroll}
              nestedScrollEnabled
              onContentSizeChange={() =>
                conversationScrollRef.current?.scrollToEnd({ animated: true })
              }
            >
              {playground.testMessages.length === 0 &&
                !playground.isConversationLoading && (
                  <View style={styles.welcomeMessage}>
                    <Text variant="bodySmall" style={styles.welcomeText}>
                      Generating opening message...
                    </Text>
                  </View>
                )}
              {playground.testMessages.map((msg, i) => (
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
                    variant="bodySmall"
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
              {playground.isConversationLoading && (
                <View style={styles.loadingBubble}>
                  <ActivityIndicator size="small" />
                </View>
              )}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                mode="outlined"
                placeholder="Type a message..."
                value={testMessageInput}
                onChangeText={setTestMessageInput}
                onSubmitEditing={handleSendConversationMessage}
                style={styles.chatInputField}
                dense
                disabled={playground.isConversationLoading}
              />
              <IconButton
                icon="send"
                onPress={handleSendConversationMessage}
                disabled={
                  !testMessageInput.trim() || playground.isConversationLoading
                }
              />
            </View>
          </Card.Content>
        </Card>
      )}

      {playground.selectedPromptKey === "occasion_recommendations" && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.cardTitle}>
              Test Context
            </Text>
            <Text variant="bodySmall" style={styles.cisSecondary}>
              Select a giver and recipient to test occasion recommendations.
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
      )}

      {playground.selectedPromptKey === "user_preferences_extraction" && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.cardTitle}>
              Test Input
            </Text>
            <Text variant="bodySmall" style={styles.cisSecondary}>
              Paste or type a sample user description of their gifting style.
            </Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={6}
              placeholder="e.g., I like to give thoughtful, personalized gifts. I plan ahead and prefer mid-range budgets..."
              value={playground.testInput}
              onChangeText={playground.setTestInput}
              style={styles.testTextInput}
              outlineStyle={styles.cisInputOutline}
            />
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
            {playground.pendingRefinement && !playground.isRefining && (
              <View style={styles.approvalRow}>
                <Button
                  mode="contained"
                  onPress={playground.approvePendingRefinement}
                  icon="check"
                  style={styles.approveButton}
                  compact
                >
                  Apply Changes
                </Button>
                <Button
                  mode="outlined"
                  onPress={playground.discardPendingRefinement}
                  icon="close"
                  compact
                >
                  Discard
                </Button>
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
              disabled={playground.isRefining}
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
              {playground.isGiftGeneration ? "Generation Results" : "Test Results"}
            </Text>
            {playground.isGiftGeneration ? (
              <GenerationResultView result={playground.generationResult} />
            ) : playground.selectedPromptKey === "add_recipient_conversation" ? (
              <ConversationResultView result={playground.generationResult} />
            ) : playground.selectedPromptKey === "occasion_recommendations" ? (
              <OccasionResultView result={playground.generationResult} />
            ) : playground.selectedPromptKey === "user_preferences_extraction" ? (
              <PreferencesResultView result={playground.generationResult} />
            ) : (
              <JsonResultView result={playground.generationResult} />
            )}
          </Card.Content>
        </Card>
      ) : (
        <Card style={[styles.card, styles.emptyResultsCard]}>
          <Card.Content style={styles.emptyResultsContent}>
            <Text variant="bodyMedium" style={styles.emptyResultsText}>
              {playground.isGiftGeneration
                ? "Select a giver and recipient, then click Generate to see results here."
                : `Click Test to run the ${playground.selectedPromptDef?.label ?? "prompt"} and see results here.`}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Production Context (gift generation only) */}
      {playground.isGiftGeneration && !!playground.generationResult?.productionContext && (
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="text"
              onPress={() => setShowProductionContext(!showProductionContext)}
              icon={showProductionContext ? "chevron-up" : "chevron-down"}
              compact
              style={styles.productionContextToggle}
            >
              Production Context
            </Button>
            {showProductionContext && (
              <View style={styles.productionContextBox}>
                <Text variant="labelSmall" style={styles.productionContextLabel}>
                  Wrapper System Message
                </Text>
                <ScrollView style={styles.productionContextScroll} nestedScrollEnabled>
                  <Text variant="bodySmall" style={styles.monoText}>
                    {String(
                      (playground.generationResult.productionContext as Record<string, unknown>)
                        ?.wrapperMessage ?? ""
                    )}
                  </Text>
                </ScrollView>
                <Text variant="labelSmall" style={[styles.productionContextLabel, { marginTop: 12 }]}>
                  Full Input Array
                </Text>
                <ScrollView style={styles.productionContextScroll} nestedScrollEnabled>
                  <Text variant="bodySmall" style={styles.monoText}>
                    {JSON.stringify(
                      (playground.generationResult.productionContext as Record<string, unknown>)
                        ?.fullInput,
                      null,
                      2
                    )}
                  </Text>
                </ScrollView>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Cron Context (when simulateCron was used) */}
      {playground.isGiftGeneration && !!playground.generationResult?.cronContext && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.cardTitle}>
              Cron Context
            </Text>
            <View style={resultStyles.statusRow}>
              <Chip compact style={resultStyles.contextChip}>
                {String(
                  (playground.generationResult.cronContext as Record<string, unknown>)
                    ?.existingSuggestionCount ?? 0
                )}{" "}
                existing suggestions
              </Chip>
            </View>
            <CronAvoidListView cronContext={playground.generationResult.cronContext as Record<string, unknown>} />
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
              This will update the live {playground.selectedPromptDef?.label ?? "prompt"}. Are you sure?
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

const CronAvoidListView: React.FC<{ cronContext: Record<string, unknown> }> = ({
  cronContext,
}) => {
  const avoidList = cronContext?.avoidList as string[] | undefined;
  if (!avoidList || avoidList.length === 0) return null;
  return (
    <View style={styles.cronAvoidList}>
      <Text variant="labelSmall" style={styles.productionContextLabel}>
        Avoid List
      </Text>
      {avoidList.map((item, i) => (
        <Text key={i} variant="bodySmall" style={styles.cronAvoidItem}>
          {item}
        </Text>
      ))}
    </View>
  );
};

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

type JsonResultViewProps = {
  result: Record<string, unknown>;
};

const JsonResultView: React.FC<JsonResultViewProps> = ({ result }) => {
  if ("error" in result) {
    return (
      <View style={styles.resultError}>
        <Text variant="bodyMedium" style={styles.errorText}>
          {String(result.error)}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.jsonResultBox} nestedScrollEnabled>
      <Text variant="bodySmall" style={styles.monoText}>
        {JSON.stringify(result, null, 2)}
      </Text>
    </ScrollView>
  );
};

// --- Formatted result views for non-gift prompts ---

const ConversationResultView: React.FC<{ result: Record<string, unknown> }> = ({
  result,
}) => {
  const [showContext, setShowContext] = useState(true);
  const [showResolvedPrompt, setShowResolvedPrompt] = useState(false);
  const ctx = result.conversationContext as Record<string, unknown> | undefined;

  if ("error" in result) {
    return (
      <View style={styles.resultError}>
        <Text variant="bodyMedium" style={styles.errorText}>
          {String(result.error)}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text variant="labelSmall" style={resultStyles.sectionLabel}>
        Latest Turn Metadata
      </Text>
      <View style={resultStyles.statusRow}>
        <Chip compact style={result.shouldShowNextStepButton ? resultStyles.activeChip : resultStyles.inactiveChip}>
          {result.shouldShowNextStepButton ? "Next-step button: visible" : "Next-step button: hidden"}
        </Chip>
      </View>
      {ctx?.readiness && (
        <View style={resultStyles.statusRow}>
          <Chip compact style={resultStyles.contextChip}>
            {String(ctx.readiness.state)}
          </Chip>
        </View>
      )}
      {ctx?.readiness && (
        <View style={resultStyles.chipRow}>
          <Chip compact style={ctx.readiness.has_recipient_anchor ? resultStyles.anchorActive : resultStyles.anchorMissing}>
            {"Recipient"}
          </Chip>
          <Chip compact style={ctx.readiness.has_occasion_anchor ? resultStyles.anchorActive : resultStyles.anchorMissing}>
            {"Occasion"}
          </Chip>
          <Chip compact style={(ctx.readiness.has_specificity_anchor || ctx.user_skipped_specificity) ? resultStyles.anchorActive : resultStyles.anchorMissing}>
            {ctx.user_skipped_specificity ? "Specificity (skipped)" : "Specificity"}
          </Chip>
        </View>
      )}
      {ctx?.readiness?.reason && (
        <Text variant="bodySmall" style={resultStyles.contextField}>
          {ctx.readiness.reason}
        </Text>
      )}
      {ctx?.needs_occasion_date && (
        <Text variant="bodySmall" style={resultStyles.contextField}>
          {"Needs date for: " + String(ctx.occasion_needing_date)}
        </Text>
      )}
      {ctx && (
        <>
          <Button
            mode="text"
            onPress={() => setShowContext(!showContext)}
            icon={showContext ? "chevron-up" : "chevron-down"}
            compact
            style={resultStyles.collapseBtn}
          >
            Extracted Context
          </Button>
          {showContext && ctx && (
            <View style={resultStyles.contextBox}>
              {ctx.name != null && (
                <Text variant="bodySmall" style={resultStyles.contextField}>
                  {"Name: " + String(ctx.name)}
                </Text>
              )}
              {ctx.relationship != null && (
                <Text variant="bodySmall" style={resultStyles.contextField}>
                  {"Relationship: " + String(ctx.relationship)}
                </Text>
              )}
              {Array.isArray(ctx.interests) && ctx.interests.length > 0 && (
                <View style={resultStyles.chipRow}>
                  <Text variant="bodySmall" style={resultStyles.contextField}>
                    {"Interests: "}
                  </Text>
                  {(ctx.interests as string[]).map((interest, i) => (
                    <Chip key={i} compact style={resultStyles.contextChip}>
                      {interest}
                    </Chip>
                  ))}
                </View>
              )}
              {ctx.birthday != null && (
                <Text variant="bodySmall" style={resultStyles.contextField}>
                  {"Birthday: " + String(ctx.birthday)}
                </Text>
              )}
              {ctx.readiness_score != null && (
                <Text variant="bodySmall" style={resultStyles.contextField}>
                  {"Legacy score: " + String(ctx.readiness_score) + "/10"}
                </Text>
              )}
            </View>
          )}
        </>
      )}
      {"resolvedSystemPrompt" in result && (
        <>
          <Button
            mode="text"
            onPress={() => setShowResolvedPrompt(!showResolvedPrompt)}
            icon={showResolvedPrompt ? "chevron-up" : "chevron-down"}
            compact
            style={resultStyles.collapseBtn}
          >
            {result.resolvedSystemPrompt === null
              ? "Resolved Prompt (skipped)"
              : "Resolved Prompt"}
          </Button>
          {showResolvedPrompt && (
            <View style={resultStyles.contextBox}>
              {result.resolvedSystemPrompt === null ? (
                <Text variant="bodySmall" style={resultStyles.contextField}>
                  {"Readiness state was \"ready\" — deterministic wrap-up was used. The system prompt was not sent to the LLM."}
                </Text>
              ) : (
                <ScrollView style={resultStyles.resolvedPromptScroll}>
                  <Text variant="bodySmall" style={resultStyles.resolvedPromptText}>
                    {String(result.resolvedSystemPrompt)}
                  </Text>
                </ScrollView>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const OccasionResultView: React.FC<{ result: Record<string, unknown> }> = ({
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

  const occasions = Array.isArray(result.primaryOccasions)
    ? result.primaryOccasions
    : [];
  const additional = Array.isArray(result.additionalSuggestions)
    ? result.additionalSuggestions
    : [];

  if (occasions.length === 0 && additional.length === 0) {
    return (
      <Text variant="bodyMedium" style={{ color: Colors.darks.brown }}>
        No occasions suggested.
      </Text>
    );
  }

  return (
    <View>
      {occasions.map((occ: any, i: number) => (
        <View key={i}>
          <View style={resultStyles.occasionHeader}>
            <Text variant="titleSmall">{occ.name || occ.type}</Text>
            {occ.isMilestone && (
              <Chip compact style={resultStyles.milestoneChip}>
                Milestone
              </Chip>
            )}
          </View>
          <View style={resultStyles.chipRow}>
            <Chip compact style={resultStyles.contextChip}>
              {occ.type}
            </Chip>
            {occ.suggestedDate && (
              <Text variant="bodySmall" style={resultStyles.occasionDate}>
                {occ.suggestedDate}
              </Text>
            )}
          </View>
          {occ.reasoning && (
            <Text variant="bodySmall" style={resultStyles.reasoning}>
              {occ.reasoning}
            </Text>
          )}
          {i < occasions.length - 1 && <Divider style={{ marginVertical: 8 }} />}
        </View>
      ))}
      {additional.length > 0 && (
        <View style={resultStyles.additionalSection}>
          <Text variant="labelSmall" style={{ color: Colors.darks.brown, marginBottom: 4 }}>
            Also consider
          </Text>
          <View style={resultStyles.chipRow}>
            {additional.map((s: string, i: number) => (
              <Chip key={i} compact style={resultStyles.contextChip}>
                {s}
              </Chip>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const PreferencesResultView: React.FC<{ result: Record<string, unknown> }> = ({
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

  const summary =
    typeof result.gifting_summary === "string" ? result.gifting_summary : null;

  if (!summary) {
    return (
      <Text variant="bodyMedium" style={{ color: Colors.darks.brown }}>
        No summary extracted.
      </Text>
    );
  }

  return (
    <View style={resultStyles.summaryBox}>
      <Text variant="bodyMedium" style={{ color: Colors.darks.brown }}>
        {summary}
      </Text>
    </View>
  );
};

const resultStyles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 4,
  },
  activeChip: {
    backgroundColor: "#d4edda",
  },
  inactiveChip: {
    backgroundColor: "#e2e3e5",
  },
  sectionLabel: {
    color: Colors.darks.brown,
    marginBottom: 4,
  },
  collapseBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  contextBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  contextField: {
    color: Colors.darks.brown,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  contextChip: {
    backgroundColor: "#e8e8e8",
  },
  anchorActive: {
    backgroundColor: "#d4edda",
  },
  anchorMissing: {
    backgroundColor: "#f8d7da",
  },
  occasionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  milestoneChip: {
    backgroundColor: Colors.yellows.amber,
  },
  occasionDate: {
    color: Colors.darks.brown,
  },
  reasoning: {
    color: Colors.darks.brown,
    fontStyle: "italic",
    marginTop: 4,
  },
  additionalSection: {
    marginTop: 12,
  },
  summaryBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
  },
  resolvedPromptScroll: {
    maxHeight: 300,
  },
  resolvedPromptText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    lineHeight: 16,
    color: Colors.darks.brown,
  },
});

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
    flexWrap: "wrap",
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  headerTitle: {
    fontWeight: "700",
  },
  promptSelector: {
    borderRadius: 8,
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

  // Non-gift context panel
  promptDescription: {
    color: Colors.darks.brown,
    marginBottom: 12,
  },
  templateVarsSection: {
    marginTop: 8,
  },
  templateVarChip: {
    backgroundColor: "#e8f4f8",
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
  },
  testTextInput: {
    marginTop: 8,
    backgroundColor: Colors.white,
    fontSize: 13,
  },
  testMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  testMessageRole: {
    backgroundColor: "#e8f4f8",
  },
  testMessageText: {
    flex: 1,
    color: Colors.darks.brown,
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
  conversationScroll: {
    maxHeight: 350,
    borderRadius: 8,
    backgroundColor: "#fafafa",
    padding: 8,
    marginBottom: 8,
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
  approvalRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
    backgroundColor: "#f9f9f9",
  },
  approveButton: {
    backgroundColor: Colors.darks.black,
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
  jsonResultBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    maxHeight: 400,
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

  // Cron simulation toggle
  cronToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cronToggleHint: {
    color: "#888",
    marginTop: 2,
  },

  // Production context
  productionContextToggle: {
    alignSelf: "flex-start",
    marginLeft: -8,
  },
  productionContextBox: {
    gap: 6,
  },
  productionContextLabel: {
    color: Colors.darks.brown,
    fontWeight: "600",
  },
  productionContextScroll: {
    maxHeight: 200,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 10,
  },

  // Cron context
  cronAvoidList: {
    marginTop: 8,
    gap: 4,
  },
  cronAvoidItem: {
    color: Colors.darks.brown,
    paddingLeft: 8,
  },
});

export default PlaygroundScreen;
