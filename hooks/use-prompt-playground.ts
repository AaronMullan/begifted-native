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
import type { PromptTestRun } from "@/lib/api";
import { PROMPT_REGISTRY, getPromptByKey } from "@/lib/prompt-registry";

const VERCEL_BACKEND_URL = "https://be-gifted.vercel.app";

async function extractInvokeError(error: unknown): Promise<string> {
  if (!(error instanceof Error)) return String(error);
  const ctx = (error as Record<string, unknown>).context;
  if (ctx && typeof (ctx as Response).json === "function") {
    try {
      const body = await (ctx as Response).json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    } catch {
      try {
        const text = await (ctx as Response).text();
        if (text) return text;
      } catch {}
    }
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

export function usePromptPlayground(userId: string) {
  const queryClient = useQueryClient();
  const configQuery = useAppConfig();

  // Playground model selection (independent from production)
  const [playgroundProvider, setPlaygroundProvider] = useState<Provider>("openai");
  const [playgroundModel, setPlaygroundModel] = useState<string>("gpt-4o-mini");
  const hasInitializedPlaygroundModel = useRef(false);

  useEffect(() => {
    if (configQuery.data && !hasInitializedPlaygroundModel.current) {
      hasInitializedPlaygroundModel.current = true;
      setPlaygroundProvider(configQuery.data.ai_provider);
      setPlaygroundModel(configQuery.data.ai_model);
    }
  }, [configQuery.data]);

  // Prompt key selection
  const [selectedPromptKey, setSelectedPromptKeyRaw] = useState(
    "gift_generation_system"
  );
  const selectedPromptDef = getPromptByKey(selectedPromptKey);
  const defaultPrompt = selectedPromptDef?.defaultPrompt ?? "";
  const isGiftGeneration = selectedPromptKey === "gift_generation_system";

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
    ? {
        giver: { ...cisPreviewQuery.data.giver, ...cisEdits.giver },
        recipient: {
          ...cisPreviewQuery.data.recipient,
          ...cisEdits.recipient,
        },
        occasion: { ...cisPreviewQuery.data.occasion, ...cisEdits.occasion },
        history: { ...cisPreviewQuery.data.history, ...cisEdits.history },
      }
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
      const { data, error } = await supabase.functions.invoke(
        "refine-prompt",
        {
          body: {
            currentPrompt,
            userInstruction: message,
            chatHistory: chatMessages,
            promptCategory: isGiftGeneration ? undefined : selectedPromptKey,
            overrideProvider: playgroundProvider,
            overrideModel: playgroundModel,
          },
        }
      );

      if (error) throw new Error(await extractInvokeError(error));

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.explanation || "Here's my proposed change.",
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      if (data.revisedPrompt) {
        setPendingRefinement({ prompt: data.revisedPrompt, explanation: data.explanation });
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error refining prompt: ${err instanceof Error ? err.message : "Unknown error"}`,
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
        if (!selectedRecipientId || !selectedGiverId || !editedCis) return;

        let existingSuggestionsForCron: { title: string | null; price: number | null; link: string | null }[] = [];
        if (simulateCron) {
          const { data: existing } = await supabase
            .from("gift_suggestions")
            .select("title, price, link")
            .eq("recipient_id", selectedRecipientId);
          existingSuggestionsForCron = (existing || []).map((s) => ({
            title: s.title,
            price: s.price,
            link: s.link,
          }));
        }

        const { data: result, error: fnError } = await supabase.functions.invoke(
          "generate-gift-suggestions",
          {
            body: {
              cis: editedCis,
              customSystemPrompt: currentPrompt,
              overrideProvider: playgroundProvider,
              overrideModel: playgroundModel,
              existingSuggestions: simulateCron ? existingSuggestionsForCron : [],
              returnContext: true,
            },
          }
        );

        if (fnError) throw new Error(await extractInvokeError(fnError));
        data = result;
      } else if (selectedPromptKey === "add_recipient_conversation") {
        // Test the add-recipient conversation prompt
        const msgs =
          testMessages.length > 0
            ? testMessages
            : [{ role: "user", content: testInput || "Hi, I want to add my mom to my gift list." }];

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
              },
              customSystemPrompt: currentPrompt,
              overrideProvider: playgroundProvider,
              overrideModel: playgroundModel,
            },
          }
        );
        if (error) throw new Error(await extractInvokeError(error));
        data = result;
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
        error: `[${playgroundProvider}/${playgroundModel}] ${err instanceof Error ? err.message : "Failed to generate"}`,
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
          content: `[${playgroundProvider}/${playgroundModel}] Error: ${err instanceof Error ? err.message : "Failed to get response"}`,
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
          content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}`,
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
      return !!selectedRecipientId && !!selectedGiverId;
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
    productionProvider: configQuery.data?.ai_provider,
    productionModel: configQuery.data?.ai_model,

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
    wrapperPreview: (cisPreviewQuery.data as Record<string, unknown>)?.wrapperPreview as string | undefined,
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
