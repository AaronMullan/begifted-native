import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAppConfig } from "@/hooks/use-app-config";
import type { Provider } from "@/lib/ai-models";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchPromptTestRuns,
  createPromptTestRun,
  fetchAllProfiles,
  fetchRecipientsForUser,
  fetchActiveSystemPrompt,
  deployNewPromptVersion,
} from "@/lib/api";
import type { PromptTestRun, AppConfig } from "@/lib/api";
import {
  PROMPT_REGISTRY,
  getPromptByKey,
  type PromptDefinition,
} from "@/lib/prompt-registry";

const VERCEL_BACKEND_URL = "https://be-gifted.vercel.app";

async function extractInvokeError(error: unknown): Promise<string> {
  if (!(error instanceof Error)) return String(error);
  const ctx = (error as unknown as Record<string, unknown>).context;
  if (!ctx || typeof (ctx as Response).json !== "function") {
    return error.message;
  }
  const response = ctx as Response;
  try {
    const body = await response.json();
    if (body?.error) return String(body.error);
    if (body?.message) return String(body.message);
    return error.message;
  } catch {
    // JSON parse failed; fall through to plain text body
  }
  try {
    const text = await response.text();
    if (text) return text;
  } catch {
    // Text read failed; fall through to default
  }
  return error.message;
}

export type CISPreview = {
  giver: {
    name: string;
    synthesized_profile?: string;
  };
  recipient: {
    name: string;
    relationship: string;
    age?: number;
    location?: string;
    interests?: string[];
    aesthetic?: string[];
    synthesized_profile?: string;
  };
  occasion: {
    type: string;
    date: string;
    significance?: string;
    budget_usd?: number;
    budget_min_usd?: number;
    budget_max_usd?: number;
  };
  history: {
    prior_gifts: {
      name: string;
      reaction?: string;
      notes?: string;
    }[];
    avoid?: string[];
  };
};

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Resolve a prompt's task-model config into a concrete provider/model. The
 * "app_config" sentinel pulls from the live admin AI model row; if it hasn't
 * loaded yet, returns null so the caller can wait instead of seeding a stale
 * default.
 */
function resolveTaskModel(
  def: PromptDefinition,
  appConfig: AppConfig | undefined
): { provider: Provider; model: string } | null {
  if (def.taskModel.provider === "app_config") {
    if (!appConfig) return null;
    return { provider: appConfig.ai_provider, model: appConfig.ai_model };
  }
  return { provider: def.taskModel.provider, model: def.taskModel.model };
}

export function usePromptPlayground(userId: string) {
  const queryClient = useQueryClient();
  const configQuery = useAppConfig();

  // Prompt key selection (must come before the model state so it can drive
  // the initial model defaults below).
  const [selectedPromptKey, setSelectedPromptKeyRaw] = useState(
    "gift_generation_system"
  );
  const selectedPromptDef = getPromptByKey(selectedPromptKey);
  const defaultPrompt = selectedPromptDef?.defaultPrompt ?? "";
  const isGiftGeneration = selectedPromptKey === "gift_generation_system";

  // Playground model — defaults to the model the selected prompt actually uses
  // in production, so Playground tests reflect real behavior. User can still
  // override via the dropdown, in which case `userTouchedModelRef` blocks the
  // per-task auto-sync until they switch prompts again.
  const [playgroundProvider, setPlaygroundProviderRaw] =
    useState<Provider>("openai");
  const [playgroundModel, setPlaygroundModelRaw] =
    useState<string>("gpt-4.1-mini");
  const userTouchedModelRef = useRef(false);

  useEffect(() => {
    if (userTouchedModelRef.current) return;
    if (!selectedPromptDef) return;
    const resolved = resolveTaskModel(selectedPromptDef, configQuery.data);
    if (!resolved) return;
    setPlaygroundProviderRaw(resolved.provider);
    setPlaygroundModelRaw(resolved.model);
  }, [selectedPromptDef, configQuery.data]);

  function setPlaygroundProvider(p: Provider) {
    userTouchedModelRef.current = true;
    setPlaygroundProviderRaw(p);
  }
  function setPlaygroundModel(m: string) {
    userTouchedModelRef.current = true;
    setPlaygroundModelRaw(m);
  }

  // CIS edit state
  const [cisEdits, setCisEdits] = useState<DeepPartial<CISPreview>>({});

  // Selection state
  const [selectedGiverId, setSelectedGiverId] = useState<string | null>(null);
  const [selectedRecipientIdRaw, setSelectedRecipientIdRaw] = useState<
    string | null
  >(null);
  function setSelectedRecipientId(id: string | null) {
    setSelectedRecipientIdRaw(id);
    setCisEdits({});
  }
  const selectedRecipientId = selectedRecipientIdRaw;

  // Prompt state
  const [currentPrompt, setCurrentPrompt] = useState(defaultPrompt);
  const originalPromptRef = useRef(defaultPrompt);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [pendingRefinement, setPendingRefinement] = useState<{
    prompt: string;
    explanation: string;
  } | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Cron simulation (gift generation only)
  const [simulateCron, setSimulateCron] = useState(false);

  // Interactive conversation state (for add_recipient_conversation)
  const [isConversationLoading, setIsConversationLoading] = useState(false);

  // Test input state (for non-gift prompts)
  const [testInput, setTestInput] = useState("");
  const [testMessages, setTestMessages] = useState<
    { role: string; content: string }[]
  >([]);

  // Handle prompt key change — reset all state
  function setSelectedPromptKey(key: string) {
    const def = getPromptByKey(key);
    if (!def) return;
    setSelectedPromptKeyRaw(key);
    setChatMessages([]);
    setGenerationResult(null);
    setTestInput("");
    setTestMessages([]);
    setPendingRefinement(null);
    // Allow the per-task model defaults to take over for the new prompt.
    userTouchedModelRef.current = false;
    // Prompt will be reset via the effect below when activePromptQuery loads
    // For now, set to the registry default
    setCurrentPrompt(def.defaultPrompt);
    originalPromptRef.current = def.defaultPrompt;
  }

  // Queries
  const allProfilesQuery = useQuery({
    queryKey: queryKeys.allProfiles(),
    queryFn: fetchAllProfiles,
  });

  const recipientsQuery = useQuery({
    queryKey: queryKeys.recipientsForUser(selectedGiverId || ""),
    queryFn: () => fetchRecipientsForUser(selectedGiverId!),
    enabled: !!selectedGiverId,
  });

  const testRunsQuery = useQuery({
    queryKey: queryKeys.promptTestRuns(userId, selectedPromptKey),
    queryFn: () => fetchPromptTestRuns(userId, selectedPromptKey),
  });

  const activePromptQuery = useQuery({
    queryKey: queryKeys.activeSystemPrompt(selectedPromptKey),
    queryFn: () => fetchActiveSystemPrompt(selectedPromptKey),
  });

  const cisPreviewQuery = useQuery({
    queryKey: ["cisPreview", selectedRecipientId],
    queryFn: async () => {
      const response = await fetch(
        `${VERCEL_BACKEND_URL}/api/admin/preview-cis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: selectedRecipientId }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`
        );
      }
      return response.json() as Promise<CISPreview>;
    },
    enabled: !!selectedRecipientId && isGiftGeneration,
  });

  // Initialize prompt from active DB version
  const hasInitialized = useRef(false);
  const lastInitKey = useRef(selectedPromptKey);
  useEffect(() => {
    // Reset initialization flag when prompt key changes
    if (lastInitKey.current !== selectedPromptKey) {
      hasInitialized.current = false;
      lastInitKey.current = selectedPromptKey;
    }
    if (activePromptQuery.data?.prompt_text && !hasInitialized.current) {
      hasInitialized.current = true;
      originalPromptRef.current = activePromptQuery.data.prompt_text;
      setCurrentPrompt(activePromptQuery.data.prompt_text);
    }
  }, [activePromptQuery.data, selectedPromptKey]);

  // Compute edited CIS by merging DB values with user edits
  const editedCis: CISPreview | null = cisPreviewQuery.data
    ? ({
        giver: { ...cisPreviewQuery.data.giver, ...cisEdits.giver },
        recipient: {
          ...cisPreviewQuery.data.recipient,
          ...cisEdits.recipient,
        },
        occasion: { ...cisPreviewQuery.data.occasion, ...cisEdits.occasion },
        history: { ...cisPreviewQuery.data.history, ...cisEdits.history },
      } as CISPreview)
    : null;

  const hasCisEdits = Object.keys(cisEdits).length > 0;

  // Set a single CIS field: setCisField("recipient", "age", 30)
  function setCisField<S extends keyof CISPreview>(
    section: S,
    field: keyof CISPreview[S],
    value: CISPreview[S][keyof CISPreview[S]]
  ) {
    setCisEdits((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, unknown>),
        [field]: value,
      },
    }));
  }

  function resetCisEdits() {
    setCisEdits({});
  }

  // When giver changes, reset recipient and CIS edits
  function handleGiverChange(giverId: string) {
    setSelectedGiverId(giverId);
    setSelectedRecipientId(null);
    setCisEdits({});
  }

  // Send a refinement message
  async function sendRefinementMessage(message: string) {
    const userMsg: ChatMessage = { role: "user", content: message };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsRefining(true);

    try {
      const { data, error } = await supabase.functions.invoke("refine-prompt", {
        body: {
          currentPrompt,
          userInstruction: message,
          chatHistory: chatMessages,
          promptCategory: isGiftGeneration ? undefined : selectedPromptKey,
          overrideProvider: playgroundProvider,
          overrideModel: playgroundModel,
        },
      });

      if (error) throw new Error(await extractInvokeError(error));

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.explanation || "Here's my proposed change.",
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      if (data.revisedPrompt) {
        setPendingRefinement({
          prompt: data.revisedPrompt,
          explanation: data.explanation,
        });
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error refining prompt: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsRefining(false);
    }
  }

  // Generate/test with the current prompt
  async function generateWithPrompt() {
    setIsGenerating(true);
    setGenerationResult(null);

    try {
      let data: Record<string, unknown>;

      if (isGiftGeneration) {
        console.log("[playground] generateWithPrompt: gift generation", {
          selectedRecipientId,
          selectedGiverId,
          hasEditedCis: !!editedCis,
          playgroundProvider,
          playgroundModel,
        });

        if (!selectedRecipientId || !selectedGiverId)
          throw new Error("Select a recipient and wait for data to load");

        console.log("[playground] calling Vercel test-generate", {
          recipientId: selectedRecipientId,
          hasCisEdits,
        });

        const response = await fetch(
          `${VERCEL_BACKEND_URL}/api/admin/test-generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientId: selectedRecipientId,
              cisOverride: hasCisEdits ? cisEdits : undefined,
              customSystemPrompt: currentPrompt,
              simulateCron,
              overrideProvider: playgroundProvider,
              overrideModel: playgroundModel,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Request failed with status ${response.status}`
          );
        }

        data = await response.json();
      } else if (selectedPromptKey === "add_recipient_conversation") {
        // Test the add-recipient conversation prompt
        const msgs =
          testMessages.length > 0
            ? testMessages
            : [
                {
                  role: "user",
                  content:
                    testInput || "Hi, I want to add my mom to my gift list.",
                },
              ];

        const { data: result, error } = await supabase.functions.invoke(
          "recipient-conversation",
          {
            body: {
              action: "conversation",
              conversationType: "add_recipient",
              messages: msgs,
              customSystemPrompt: currentPrompt,
              overrideProvider: playgroundProvider,
              overrideModel: playgroundModel,
            },
          }
        );
        if (error) throw new Error(await extractInvokeError(error));
        data = result;
      } else if (selectedPromptKey === "occasion_recommendations") {
        // Test occasion recommendations — needs recipient data
        if (!selectedRecipientId || !selectedGiverId) return;
        const recipient = recipientsQuery.data?.find(
          (r) => r.id === selectedRecipientId
        );
        if (!recipient) throw new Error("Recipient not found");

        const { data: result, error } = await supabase.functions.invoke(
          "recipient-conversation",
          {
            body: {
              action: "recommend_occasions",
              extractedData: {
                name: recipient.name,
                relationship_type: recipient.relationship_type,
                birthday: recipient.birthday,
                interests: recipient.interests,
                knownRoles: recipient.known_roles ?? [],
                householdContext: recipient.household_context ?? "",
                // Feed the stored synthesized profile so rich existing
                // recipients (e.g. Atticus) reach the prompt's recipient
                // lens — the gap DEV-155 closes.
                synthesized_profile: recipient.synthesized_profile ?? "",
              },
              customSystemPrompt: currentPrompt,
              overrideProvider: playgroundProvider,
              overrideModel: playgroundModel,
            },
          }
        );
        if (error) throw new Error(await extractInvokeError(error));
        data = result;
      } else if (selectedPromptKey === "add_recipient_wrap_up") {
        // Deterministic template — no LLM call. Render the prompt with a
        // sample recipient name so the PM can preview the resolved string.
        const recipient = recipientsQuery.data?.find(
          (r) => r.id === selectedRecipientId
        );
        const recipientName = recipient?.name || testInput.trim() || "Mary";
        const preview = currentPrompt.replace(
          /\{\{recipientName\}\}/g,
          recipientName
        );
        data = { preview, recipientName };
      } else if (selectedPromptKey === "user_preferences_extraction") {
        // Test user preferences extraction
        const sampleText =
          testInput ||
          "I like to give thoughtful, personalized gifts. I plan ahead and prefer mid-range budgets.";

        const { data: result, error } = await supabase.functions.invoke(
          "extract-user-preferences",
          {
            body: {
              text: sampleText,
              customSystemPrompt: currentPrompt,
              overrideProvider: playgroundProvider,
              overrideModel: playgroundModel,
            },
          }
        );
        if (error) throw new Error(await extractInvokeError(error));
        data = result;
      } else {
        throw new Error(`Unknown prompt key: ${selectedPromptKey}`);
      }

      setGenerationResult(data);

      // Persist test run — isolated so a DB error doesn't wipe the result
      try {
        await createPromptTestRun({
          user_id: userId,
          recipient_id: isGiftGeneration ? selectedRecipientId : null,
          custom_system_prompt: currentPrompt,
          original_system_prompt: originalPromptRef.current,
          chat_messages: chatMessages,
          generation_result: data,
          prompt_key: selectedPromptKey,
          ai_provider: playgroundProvider,
          ai_model: playgroundModel,
        });

        queryClient.invalidateQueries({
          queryKey: queryKeys.promptTestRuns(userId, selectedPromptKey),
        });
      } catch (persistErr) {
        console.warn("Failed to persist test run:", persistErr);
      }
    } catch (err) {
      console.error("Generation error:", err);
      setGenerationResult({
        error: `[${playgroundProvider}/${playgroundModel}] ${
          err instanceof Error ? err.message : "Failed to generate"
        }`,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  // Deploy current prompt to production
  const deployMutation = useMutation({
    mutationFn: (changeNotes: string) =>
      deployNewPromptVersion(
        selectedPromptKey,
        currentPrompt,
        changeNotes,
        userId
      ),
    onSuccess: () => {
      originalPromptRef.current = currentPrompt;
      queryClient.invalidateQueries({
        queryKey: queryKeys.activeSystemPrompt(selectedPromptKey),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.promptVersionHistory(selectedPromptKey),
      });
    },
  });

  function approvePendingRefinement() {
    if (!pendingRefinement) return;
    setCurrentPrompt(pendingRefinement.prompt);
    setPendingRefinement(null);
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: "✓ Changes applied." },
    ]);
  }

  function discardPendingRefinement() {
    setPendingRefinement(null);
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: "✗ Changes discarded." },
    ]);
  }

  // Reset prompt to the active version
  function resetPrompt() {
    setCurrentPrompt(originalPromptRef.current);
    setChatMessages([]);
    setGenerationResult(null);
    setPendingRefinement(null);
  }

  // Load a previous test run
  function loadTestRun(run: PromptTestRun) {
    setCurrentPrompt(run.custom_system_prompt);
    setChatMessages(run.chat_messages as ChatMessage[]);
    setGenerationResult(run.generation_result);
  }

  // Add a test message (for add_recipient_conversation testing)
  function addTestMessage(content: string) {
    setTestMessages((prev) => [...prev, { role: "user", content }]);
  }

  function clearTestMessages() {
    setTestMessages([]);
    setGenerationResult(null);
  }

  async function generateFirstMessage() {
    setIsConversationLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "recipient-conversation",
        {
          body: {
            action: "conversation",
            conversationType: "add_recipient",
            messages: [],
            customSystemPrompt: currentPrompt,
            overrideProvider: playgroundProvider,
            overrideModel: playgroundModel,
          },
        }
      );
      if (error) throw new Error(await extractInvokeError(error));

      setTestMessages([{ role: "assistant", content: data.reply }]);
      setGenerationResult(data);
    } catch (err) {
      setTestMessages([
        {
          role: "assistant",
          content: `[${playgroundProvider}/${playgroundModel}] Error: ${
            err instanceof Error ? err.message : "Failed to get response"
          }`,
        },
      ]);
    } finally {
      setIsConversationLoading(false);
    }
  }

  async function sendConversationMessage(content: string) {
    const userMsg = { role: "user", content };
    const updatedMessages = [...testMessages, userMsg];
    setTestMessages(updatedMessages);
    setIsConversationLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "recipient-conversation",
        {
          body: {
            action: "conversation",
            conversationType: "add_recipient",
            messages: updatedMessages,
            customSystemPrompt: currentPrompt,
            overrideProvider: playgroundProvider,
            overrideModel: playgroundModel,
          },
        }
      );
      if (error) throw new Error(await extractInvokeError(error));

      setTestMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
      setGenerationResult(data);
    } catch (err) {
      setTestMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${
            err instanceof Error ? err.message : "Failed to get response"
          }`,
        },
      ]);
    } finally {
      setIsConversationLoading(false);
    }
  }

  const hasPromptChanged = currentPrompt !== originalPromptRef.current;

  // Determine if Generate button should be enabled
  const canGenerate = (() => {
    if (isGenerating) return false;
    if (isGiftGeneration)
      return !!selectedRecipientId && !!selectedGiverId && !!editedCis;
    if (selectedPromptKey === "occasion_recommendations")
      return !!selectedRecipientId && !!selectedGiverId;
    // add_recipient_conversation and user_preferences_extraction always work
    return true;
  })();

  return {
    // Playground model (independent from production)
    playgroundProvider,
    playgroundModel,
    setPlaygroundProvider,
    setPlaygroundModel,
    // Production model — derived from the selected prompt's taskModel, so
    // each prompt reports the model it actually runs against in prod (not the
    // global app_config row, which only drives the two heavy-model tasks).
    productionProvider: selectedPromptDef
      ? resolveTaskModel(selectedPromptDef, configQuery.data)?.provider
      : undefined,
    productionModel: selectedPromptDef
      ? resolveTaskModel(selectedPromptDef, configQuery.data)?.model
      : undefined,
    productionModelSource:
      selectedPromptDef?.taskModel.provider === "app_config"
        ? ("app_config" as const)
        : ("hardcoded" as const),

    // Prompt key
    selectedPromptKey,
    setSelectedPromptKey,
    selectedPromptDef,
    promptRegistry: PROMPT_REGISTRY,
    isGiftGeneration,

    // Selection
    selectedGiverId,
    selectedRecipientId,
    setSelectedRecipientId,
    handleGiverChange,

    // Data
    profiles: allProfilesQuery.data || [],
    recipients: recipientsQuery.data || [],
    testRuns: testRunsQuery.data || [],
    activePrompt: activePromptQuery.data,

    // Prompt
    currentPrompt,
    setCurrentPrompt,
    originalPrompt: originalPromptRef.current,
    hasPromptChanged,
    resetPrompt,

    // Chat
    chatMessages,
    isRefining,
    sendRefinementMessage,
    pendingRefinement,
    approvePendingRefinement,
    discardPendingRefinement,

    // Generation
    isGenerating,
    generationResult,
    generateWithPrompt,
    canGenerate,

    // Deploy
    deployToProduction: deployMutation.mutateAsync,
    isDeploying: deployMutation.isPending,

    // Test runs
    loadTestRun,

    // Test input (non-gift prompts)
    testInput,
    setTestInput,
    testMessages,
    addTestMessage,
    clearTestMessages,
    startConversation: generateFirstMessage,
    sendConversationMessage,
    isConversationLoading,

    // CIS preview + editing (gift generation only)
    cisPreview: cisPreviewQuery.data || null,
    wrapperPreview: (cisPreviewQuery.data as Record<string, unknown>)
      ?.wrapperPreview as string | undefined,
    editedCis,
    cisEdits,
    hasCisEdits,
    setCisField,
    resetCisEdits,
    isLoadingCis: cisPreviewQuery.isLoading,

    // Cron simulation
    simulateCron,
    setSimulateCron,

    // Loading states
    isLoadingProfiles: allProfilesQuery.isLoading,
    isLoadingRecipients: recipientsQuery.isLoading,
  };
}
