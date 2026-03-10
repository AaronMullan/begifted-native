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

const VERCEL_BACKEND_URL = "https://be-gifted.vercel.app";

export const DEFAULT_SYSTEM_PROMPT = `BeGifted Gift Protocol v1

Purpose: Generate real, purchasable gift suggestions for U.S. recipients.

Rules Summary:
- Use web_search tool to find live product pages. NEVER invent URLs.
- ONLY use URLs that come from actual search results. Every URL must be verified from search.
- US retailers only (no Etsy, no non-US TLDs).
- Provide direct product URLs with visible "Buy" or "Add to Cart" buttons.
- Search for specific product names and model numbers on major retailers (Amazon, Target, Walmart, Best Buy).
- Respect CIS constraints (budget, timing, tone, spending_tendencies).
- Use the giver's spending_tendencies from the CIS to guide price point and gift selection (e.g., "practical" vs "premium", "budget-conscious" vs "luxury").
- Output valid JSON:
  {
    "status": "ok" | "no_results",
    "suggestions": [
       { "name", "retailer", "url", "image_url", "price_usd", "category", "tags", "reason" }
    ]
  }
- Return JSON only. No commentary, no Markdown.
- CRITICAL: All URLs in the response MUST be from actual search results. Do not create or make up any URLs.`;

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

  // Generate gifts with the current prompt via Vercel backend
  async function generateWithPrompt() {
    if (!selectedRecipientId || !selectedGiverId) return;

    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const response = await fetch(
        `${VERCEL_BACKEND_URL}/api/admin/test-generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientId: selectedRecipientId,
            customSystemPrompt: currentPrompt,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();
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
