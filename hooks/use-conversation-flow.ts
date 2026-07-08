import { useState, useRef, useEffect } from "react";
import * as Sentry from "@sentry/react-native";
import { supabase } from "../lib/supabase";
import { Alert, View } from "react-native";
import { isBackgroundCancelledFetch } from "../lib/sentry-helpers";
import { invokeWithRetry } from "../lib/edge-retry";
import { normalizeBirthday } from "../utils/birthday";

/**
 * Repair the birthday on a freshly-extracted payload into our canonical
 * storage form (YYYY-MM-DD or --MM-DD) so form state never carries the
 * LLM's "0000-MM-DD" placeholder year. Leaves the field absent when the
 * model didn't extract one; leaves a truly unparseable value in place so
 * the review form can surface its inline error.
 */
function sanitizeExtractedBirthday(extracted: ExtractedData): ExtractedData {
  if (!("birthday" in extracted) || extracted.birthday == null)
    return extracted;
  const canonical = normalizeBirthday(extracted.birthday);
  if (canonical === null) return extracted;
  if (canonical === extracted.birthday) return extracted;
  return { ...extracted, birthday: canonical };
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export type ConversationType =
  | "add_recipient"
  | "add_occasion"
  | "update_field"
  | "extract_interests"
  | "extract_preferences"
  | "extract_birthday"
  | "extract_address";

export interface ExtractedData {
  name?: string;
  relationship_type?: string;
  interests?: string[];
  // Interests the user wants dropped in an update conversation. Reconciled
  // against the recipient's existing interests on the client (DEV-119).
  interests_removed?: string[];
  birthday?: string;
  emotional_tone_preference?: string;
  // Life roles / household signal captured during extraction. Feeds the
  // occasion prompt so a spouse-who-is-a-parent gets Mother's/Father's Day,
  // while spouse/partner status alone never implies parenthood (DEV-114).
  knownRoles?: string[];
  householdContext?: string;
  // Cultural/ethnic/religious context and important personal dates captured
  // during extraction. Feed the occasion prompt's {{culturalContext}} and
  // {{importantDates}} placeholders (DEV-156).
  culturalContext?: string;
  importantDates?: string[];
  gift_budget_min?: number;
  gift_budget_max?: number;
  address?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  occasions?: {
    date: string;
    occasion_type: string;
  }[];
  [key: string]: unknown;
}

export interface RecipientData {
  id?: string;
  name?: string;
  relationship_type?: string;
  interests?: string[];
  birthday?: string;
  emotional_tone_preference?: string;
  gift_budget_min?: number;
  gift_budget_max?: number;
  address?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  [key: string]: unknown;
}

interface UseConversationFlowOptions {
  conversationType: ConversationType;
  targetFields?: string[];
  existingData?: RecipientData;
  /** Assistant's welcome message (defaults by conversationType) */
  initialMessage?: string;
  /** If set, added as a user message and sent automatically after the welcome */
  initialUserMessage?: string;
  onExtractSuccess?: (data: ExtractedData) => void;
  onExtractError?: (error: Error) => void;
}

interface UseConversationFlowReturn {
  messages: Message[];
  isLoading: boolean;
  extractedData: ExtractedData | null;
  shouldShowNextStepButton: boolean;
  conversationContext: string | null;
  messagesEndRef: React.RefObject<View | null>;
  sendMessage: (message: string) => Promise<void>;
  /** True when the last send failed and a manual retry is available. */
  canRetrySend: boolean;
  /** Re-send the last failed turn (clears the error bubble first). */
  retryLastSend: () => Promise<void>;
  handleFinishConversation: () => Promise<ExtractedData | null>;
  setMessages: (messages: Message[]) => void;
  setExtractedData: (data: ExtractedData | null) => void;
  resetConversation: () => void;
}

type ConversationRequestBody = {
  action: "conversation" | "extract";
  conversationType: ConversationType;
  messages: { role: "user" | "assistant"; content: string }[];
  targetFields?: string[];
  existingData?: RecipientData;
};

type ConversationReply = {
  reply?: string;
  conversationContext?: string;
  shouldShowNextStepButton?: boolean;
};

// The extract endpoint sometimes wraps the payload in `{ extractedData }` and
// sometimes returns the fields at the top level, so accept both shapes.
type ExtractResponse = ExtractedData & { extractedData?: ExtractedData };

// Default welcome messages based on conversation type
const getDefaultWelcomeMessage = (
  conversationType: ConversationType
): string => {
  switch (conversationType) {
    case "add_recipient":
      return "Hello! I'll help you add a new recipient. Tell me about the person you'd like to add.";
    case "add_occasion":
      return "What occasion would you like to add for this person?";
    case "extract_interests":
      return "I'll help you update their interests. What interests would you like to add or change?";
    case "extract_preferences":
      return "I'll help you update their gift preferences. What would you like to change?";
    case "extract_birthday":
      return "I'll help you update their birthday. What's their new birthday?";
    case "extract_address":
      return "I'll help you update their address. What's their new address?";
    case "update_field":
      return "I'll help you update this information. What would you like to change?";
    default:
      return "Hello! How can I help you?";
  }
};

export function useConversationFlow(
  options: UseConversationFlowOptions
): UseConversationFlowReturn {
  const {
    conversationType,
    targetFields,
    existingData,
    initialMessage,
    initialUserMessage,
    onExtractSuccess,
    onExtractError,
  } = options;

  const messagesEndRef = useRef<View | null>(null);
  const initialUserMessageSentRef = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(
    null
  );
  const [conversationContext, setConversationContext] = useState<string | null>(
    null
  );
  const [shouldShowNextStepButton, setShouldShowNextStepButton] =
    useState(false);
  // When a send fails after the retry wrapper exhausts its attempts, we stash
  // the conversation (up to and including the failed user turn) so the UI can
  // offer a manual "Try again" CTA that re-sends without duplicating the turn
  // (DEV-134).
  const [pendingRetry, setPendingRetry] = useState<Message[] | null>(null);

  // Stable timestamp for the seeded welcome message; a fresh Date() would be an
  // impure call during the render-time seeding below.
  const [welcomeTimestamp] = useState(() => new Date());

  // Seed the welcome message whenever the conversation is pristine (first mount
  // and after resetConversation). While the chat is still pristine — just the
  // welcome, no user turn — keep it in sync with initialMessage, so a greeting
  // seeded before async data arrived (e.g. the recipient's name) gets the real
  // value instead of a blank. Done during render (not an effect): the content
  // guard makes it idempotent and the pristine check stops it after a reply.
  const conversationPristine =
    messages.length === 0 ||
    (messages.length === 1 &&
      messages[0].role === "assistant" &&
      messages[0].id === "1");
  if (conversationPristine) {
    const welcomeMessage =
      initialMessage || getDefaultWelcomeMessage(conversationType);
    if (!(messages.length === 1 && messages[0].content === welcomeMessage)) {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: welcomeMessage,
          timestamp: welcomeTimestamp,
        },
      ]);
    }
  }

  // Sends an already-assembled conversation (ending at the user's turn) to the
  // edge function. Shared by sendMessage and retryLastSend so a manual retry
  // doesn't re-append the user turn.
  const sendConversationTurn = async (convo: Message[]) => {
    setIsLoading(true);

    try {
      // Get session for auth
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      // Prepare request body
      const requestBody: ConversationRequestBody = {
        action: "conversation",
        conversationType,
        messages: convo.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      // Add optional fields if provided
      if (targetFields && targetFields.length > 0) {
        requestBody.targetFields = targetFields;
      }
      if (existingData) {
        requestBody.existingData = existingData;
      }

      // Call Supabase Edge Function for conversation (retries transient
      // network/5xx failures with backoff before surfacing an error).
      const { data, error } = await invokeWithRetry<ConversationReply>(
        "recipient-conversation",
        {
          body: requestBody,
        }
      );

      if (error) {
        console.error("Supabase function error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.reply || "I understand. Tell me more.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationContext(data?.conversationContext || conversationContext);
      setShouldShowNextStepButton(data?.shouldShowNextStepButton || false);
      setPendingRetry(null);
    } catch (error) {
      console.error("Error sending message:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      if (!isBackgroundCancelledFetch(error)) {
        Sentry.captureException(error, {
          tags: {
            edge_function: "recipient-conversation",
            action: "conversation",
            conversationType,
          },
        });
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I hit an error sending that.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      // Retries are already exhausted inside invokeWithRetry — surface a
      // manual "Try again" CTA (DEV-134) instead of a dead-end Alert.
      setPendingRetry(convo);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
    };

    const convo = [...messages, userMessage];
    setMessages(convo);
    setPendingRetry(null);
    await sendConversationTurn(convo);
  };

  // Re-send the last failed turn. Resetting messages to the stashed
  // conversation drops the error bubble that was appended after the failure.
  const retryLastSend = async () => {
    if (!pendingRetry || isLoading) return;
    const convo = pendingRetry;
    setMessages(convo);
    setPendingRetry(null);
    await sendConversationTurn(convo);
  };

  // When initialUserMessage is set, send it once after the welcome message is shown
  useEffect(() => {
    if (
      initialUserMessage?.trim() &&
      messages.length === 1 &&
      !initialUserMessageSentRef.current
    ) {
      initialUserMessageSentRef.current = true;
      sendMessage(initialUserMessage.trim());
    }
  }, [initialUserMessage, messages.length, sendMessage]);

  const handleFinishConversation = async (): Promise<ExtractedData | null> => {
    setIsLoading(true);
    try {
      // Get session for auth
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      // Prepare request body
      const requestBody: ConversationRequestBody = {
        action: "extract",
        conversationType,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      // Add optional fields if provided
      if (targetFields && targetFields.length > 0) {
        requestBody.targetFields = targetFields;
      }
      if (existingData) {
        requestBody.existingData = existingData;
      }

      // Call Supabase Edge Function for data extraction (retries transient
      // network/5xx failures with backoff before surfacing an error).
      const { data, error } = await invokeWithRetry<ExtractResponse>(
        "recipient-conversation",
        {
          body: requestBody,
        }
      );

      if (error) {
        console.error("Supabase function error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      // The Edge Function returns { extractedData }
      const rawExtracted = data?.extractedData || data;

      if (rawExtracted) {
        const extracted = sanitizeExtractedBirthday(rawExtracted);
        setExtractedData(extracted);

        // Call success callback if provided
        if (onExtractSuccess) {
          onExtractSuccess(extracted);
        }

        return extracted;
      }

      return null;
    } catch (error) {
      console.error("Error finishing conversation:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      if (!isBackgroundCancelledFetch(error)) {
        Sentry.captureException(error, {
          tags: {
            edge_function: "recipient-conversation",
            action: "extract",
            conversationType,
          },
        });
      }

      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to extract data. Please try again.";

      // Call error callback if provided
      if (onExtractError) {
        onExtractError(error instanceof Error ? error : new Error(errorMsg));
      } else {
        Alert.alert("Error", errorMsg);
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setExtractedData(null);
    setConversationContext(null);
    setShouldShowNextStepButton(false);
    setIsLoading(false);
    setPendingRetry(null);
  };

  return {
    messages,
    isLoading,
    extractedData,
    shouldShowNextStepButton,
    conversationContext,
    messagesEndRef,
    sendMessage,
    canRetrySend: pendingRetry !== null,
    retryLastSend,
    handleFinishConversation,
    setMessages,
    setExtractedData,
    resetConversation,
  };
}
