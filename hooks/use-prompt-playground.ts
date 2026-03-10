import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
import type { Recipient } from "@/types/recipient";

export const DEFAULT_SYSTEM_PROMPT = `You are an expert gift curator with access to detailed conversation context about the recipient and the gift giver's personal style. Your goal is to recommend SPECIFIC, REAL PRODUCTS that can be purchased directly from reputable online retailers.

**CRITICAL REQUIREMENTS**:
- Recommend specific, real products with direct URLs to their product pages on Amazon or the retailer's website


**QUALITY STANDARDS**:
- Reference specific conversation details in descriptions
- Avoid generic suggestions that could apply to anyone
- Choose well-designed, thoughtful items
- Balance usefulness with emotional significance

**PRODUCT SPECIFICITY**:
- Example: "Nike Air Zoom Pegasus 40" NOT "running shoes"
- Example: "Born to Run by Christopher McDougal" NOT "running book"
- Example: "Brother XM2701 Sewing Machine" NOT "sewing equipment"`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function usePromptPlayground(userId: string) {
  const queryClient = useQueryClient();

  // Selection state
  const [selectedGiverId, setSelectedGiverId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null
  );

  // Prompt state
  const [currentPrompt, setCurrentPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const originalPromptRef = useRef(DEFAULT_SYSTEM_PROMPT);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isRefining, setIsRefining] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<Record<
    string,
    unknown
  > | null>(null);

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
    queryKey: queryKeys.promptTestRuns(userId),
    queryFn: () => fetchPromptTestRuns(userId),
  });

  const activePromptQuery = useQuery({
    queryKey: queryKeys.activeSystemPrompt("gift_generation_system"),
    queryFn: () => fetchActiveSystemPrompt("gift_generation_system"),
  });

  // Initialize prompt from active DB version
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (
      activePromptQuery.data?.prompt_text &&
      !hasInitialized.current
    ) {
      hasInitialized.current = true;
      originalPromptRef.current = activePromptQuery.data.prompt_text;
      setCurrentPrompt(activePromptQuery.data.prompt_text);
    }
  }, [activePromptQuery.data]);

  // When giver changes, reset recipient
  function handleGiverChange(giverId: string) {
    setSelectedGiverId(giverId);
    setSelectedRecipientId(null);
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
          },
        }
      );

      if (error) throw error;

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.explanation || "Prompt updated.",
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      if (data.revisedPrompt) {
        setCurrentPrompt(data.revisedPrompt);
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

  // Generate gifts with the current prompt
  async function generateWithPrompt() {
    if (!selectedRecipientId || !selectedGiverId) return;

    setIsGenerating(true);
    setGenerationResult(null);

    try {
      // Find the selected recipient's data
      const recipient = recipientsQuery.data?.find(
        (r: Recipient) => r.id === selectedRecipientId
      );
      if (!recipient) throw new Error("Recipient not found");

      const { data, error } = await supabase.functions.invoke(
        "generate-gift-suggestions",
        {
          body: {
            recipientName: recipient.name,
            relationship: recipient.relationship_type,
            interests: recipient.interests,
            giftingTone: recipient.emotional_tone_preference,
            budget:
              recipient.gift_budget_min || recipient.gift_budget_max
                ? {
                    min: recipient.gift_budget_min,
                    max: recipient.gift_budget_max,
                  }
                : undefined,
            userId: selectedGiverId,
            customSystemPrompt: currentPrompt,
          },
        }
      );

      if (error) throw error;

      setGenerationResult(data);

      // Persist test run
      await createPromptTestRun({
        user_id: userId,
        recipient_id: selectedRecipientId,
        custom_system_prompt: currentPrompt,
        original_system_prompt: originalPromptRef.current,
        chat_messages: chatMessages,
        generation_result: data,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.promptTestRuns(userId),
      });
    } catch (err) {
      console.error("Generation error:", err);
      setGenerationResult({
        error:
          err instanceof Error ? err.message : "Failed to generate suggestions",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  // Deploy current prompt to production
  const deployMutation = useMutation({
    mutationFn: (changeNotes: string) =>
      deployNewPromptVersion(
        "gift_generation_system",
        currentPrompt,
        changeNotes,
        userId
      ),
    onSuccess: () => {
      originalPromptRef.current = currentPrompt;
      queryClient.invalidateQueries({
        queryKey: queryKeys.activeSystemPrompt("gift_generation_system"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.promptVersionHistory("gift_generation_system"),
      });
    },
  });

  // Reset prompt to the active version
  function resetPrompt() {
    setCurrentPrompt(originalPromptRef.current);
    setChatMessages([]);
    setGenerationResult(null);
  }

  // Load a previous test run
  function loadTestRun(run: PromptTestRun) {
    setCurrentPrompt(run.custom_system_prompt);
    setChatMessages(run.chat_messages as ChatMessage[]);
    setGenerationResult(run.generation_result);
  }

  const hasPromptChanged = currentPrompt !== originalPromptRef.current;

  return {
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

    // Generation
    isGenerating,
    generationResult,
    generateWithPrompt,

    // Deploy
    deployToProduction: deployMutation.mutateAsync,
    isDeploying: deployMutation.isPending,

    // Test runs
    loadTestRun,

    // Loading states
    isLoadingProfiles: allProfilesQuery.isLoading,
    isLoadingRecipients: recipientsQuery.isLoading,
  };
}
