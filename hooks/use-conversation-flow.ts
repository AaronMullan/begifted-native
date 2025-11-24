import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Alert } from "react-native";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export type ConversationType =
  | "add_recipient"
  | "update_field"
  | "extract_interests"
  | "extract_preferences"
  | "extract_birthday"
  | "extract_address";

export interface ExtractedData {
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
  occasions?: Array<{
    date: string;
    occasion_type: string;
  }>;
  [key: string]: any; // Allow additional fields
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
  [key: string]: any;
}

interface UseConversationFlowOptions {
  conversationType: ConversationType;
  targetFields?: string[];
  existingData?: RecipientData;
  initialMessage?: string;
  onExtractSuccess?: (data: ExtractedData) => void;
  onExtractError?: (error: Error) => void;
}

interface UseConversationFlowReturn {
  messages: Message[];
  isLoading: boolean;
  extractedData: ExtractedData | null;
  shouldShowNextStepButton: boolean;
  conversationContext: any;
  messagesEndRef: React.RefObject<any>;
  sendMessage: (message: string) => Promise<void>;
  handleFinishConversation: () => Promise<ExtractedData | null>;
  setMessages: (messages: Message[]) => void;
  setExtractedData: (data: ExtractedData | null) => void;
  resetConversation: () => void;
}

// Default welcome messages based on conversation type
const getDefaultWelcomeMessage = (
  conversationType: ConversationType
): string => {
  switch (conversationType) {
    case "add_recipient":
      return "Hello! I'll help you add a new recipient. Tell me about the person you'd like to add.";
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
    onExtractSuccess,
    onExtractError,
  } = options;

  const messagesEndRef = useRef<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(
    null
  );
  const [conversationContext, setConversationContext] = useState<any>(null);
  const [shouldShowNextStepButton, setShouldShowNextStepButton] =
    useState(false);

  // Initialize conversation with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage =
        initialMessage || getDefaultWelcomeMessage(conversationType);
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: message.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
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
        const requestBody: any = {
          action: "conversation",
          conversationType,
          messages: [...messages, userMessage].map((m) => ({
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

        // Call Supabase Edge Function for conversation
        const { data, error } = await supabase.functions.invoke(
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
          content: data.reply || "I understand. Tell me more.",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setConversationContext(data.conversationContext || conversationContext);
        setShouldShowNextStepButton(data.shouldShowNextStepButton || false);

        // Auto-scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollToEnd?.({ animated: true });
        }, 100);
      } catch (error) {
        console.error("Error sending message:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "I'm sorry, I encountered an error. Could you please try again?",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to send message. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      messages,
      isLoading,
      conversationContext,
      conversationType,
      targetFields,
      existingData,
    ]
  );

  const handleFinishConversation =
    useCallback(async (): Promise<ExtractedData | null> => {
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
        const requestBody: any = {
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

        // Call Supabase Edge Function for data extraction
        const { data, error } = await supabase.functions.invoke(
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
        const extracted = data.extractedData || data;

        if (extracted) {
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
    }, [
      messages,
      conversationType,
      targetFields,
      existingData,
      onExtractSuccess,
      onExtractError,
    ]);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setExtractedData(null);
    setConversationContext(null);
    setShouldShowNextStepButton(false);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    extractedData,
    shouldShowNextStepButton,
    conversationContext,
    messagesEndRef,
    sendMessage,
    handleFinishConversation,
    setMessages,
    setExtractedData,
    resetConversation,
  };
}
