import {
  errorStyles,
  resultStyles,
} from "@/components/admin/playground/result-styles";
import { Colors } from "@/lib/colors";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Chip, Text } from "react-native-paper";

export const PreferencesResultView: React.FC<{
  result: Record<string, unknown>;
}> = ({ result }) => {
  const [showUserInput, setShowUserInput] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);

  if ("error" in result) {
    return (
      <View style={errorStyles.resultError}>
        <Text variant="bodyMedium" style={errorStyles.errorText}>
          {String(result.error)}
        </Text>
      </View>
    );
  }

  const us = result.user_summary as Record<string, unknown> | undefined;
  const userInput =
    typeof result.userInput === "string" ? result.userInput : null;
  const resolvedPrompt =
    typeof result.resolvedSystemPrompt === "string"
      ? result.resolvedSystemPrompt
      : null;
  const rawResponse =
    typeof result.rawResponse === "string" ? result.rawResponse : null;
  const modelUsed = result.modelUsed as
    { provider?: string; model?: string } | undefined;

  const arrayFields: { label: string; key: string }[] = [
    { label: "Taste & World", key: "taste_and_world" },
    { label: "Care & Relationship Style", key: "care_and_relationship_style" },
    { label: "Giver Style Implications", key: "giver_style_implications" },
    { label: "Things to Avoid", key: "things_to_avoid" },
  ];

  return (
    <View>
      <Text variant="bodySmall" style={resultStyles.processIntro}>
        {
          "Single-shot extraction (no chat). Steps 1–3 show exactly what was sent to and returned by the model. Step 4 is the parsed result the app stores."
        }
      </Text>

      {modelUsed?.provider && modelUsed?.model && (
        <View style={resultStyles.statusRow}>
          <Chip compact style={resultStyles.contextChip}>
            {`Model: ${modelUsed.provider} · ${modelUsed.model}`}
          </Chip>
        </View>
      )}

      {/* Step 1 — User input */}
      {userInput !== null && (
        <>
          <Button
            mode="text"
            onPress={() => setShowUserInput(!showUserInput)}
            icon={showUserInput ? "chevron-up" : "chevron-down"}
            compact
            style={resultStyles.collapseBtn}
          >
            {"Step 1 — User Input"}
          </Button>
          {showUserInput && (
            <View style={resultStyles.contextBox}>
              <ScrollView style={resultStyles.resolvedPromptScroll}>
                <Text
                  variant="bodySmall"
                  style={resultStyles.resolvedPromptText}
                >
                  {userInput}
                </Text>
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Step 2 — System prompt as sent */}
      {resolvedPrompt !== null && (
        <>
          <Button
            mode="text"
            onPress={() => setShowSystemPrompt(!showSystemPrompt)}
            icon={showSystemPrompt ? "chevron-up" : "chevron-down"}
            compact
            style={resultStyles.collapseBtn}
          >
            {"Step 2 — System Prompt Sent"}
          </Button>
          {showSystemPrompt && (
            <View style={resultStyles.contextBox}>
              <ScrollView style={resultStyles.resolvedPromptScroll}>
                <Text
                  variant="bodySmall"
                  style={resultStyles.resolvedPromptText}
                >
                  {resolvedPrompt}
                </Text>
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Step 3 — Raw model response (pre-parse) */}
      {rawResponse !== null && (
        <>
          <Button
            mode="text"
            onPress={() => setShowRawResponse(!showRawResponse)}
            icon={showRawResponse ? "chevron-up" : "chevron-down"}
            compact
            style={resultStyles.collapseBtn}
          >
            {"Step 3 — Raw Model Response"}
          </Button>
          {showRawResponse && (
            <View style={resultStyles.contextBox}>
              <ScrollView style={resultStyles.resolvedPromptScroll}>
                <Text
                  variant="bodySmall"
                  style={resultStyles.resolvedPromptText}
                >
                  {rawResponse}
                </Text>
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Step 4 — Parsed user_summary */}
      <Text variant="labelSmall" style={resultStyles.stepHeader}>
        {"Step 4 — Extracted user_summary (what the app stores)"}
      </Text>
      {!us ? (
        <Text variant="bodyMedium" style={{ color: Colors.darks.brown }}>
          No summary extracted.
        </Text>
      ) : (
        <View style={resultStyles.summaryBox}>
          {typeof us.user_summary === "string" && us.user_summary ? (
            <View style={{ marginBottom: 10 }}>
              <Text
                variant="labelSmall"
                style={{
                  color: Colors.darks.brown,
                  fontWeight: "700",
                  marginBottom: 2,
                }}
              >
                Summary
              </Text>
              <Text variant="bodyMedium" style={{ color: Colors.darks.brown }}>
                {us.user_summary}
              </Text>
            </View>
          ) : null}
          {arrayFields.map(({ label, key }) => {
            const items = Array.isArray(us[key]) ? (us[key] as string[]) : [];
            return items.length > 0 ? (
              <View key={key} style={{ marginBottom: 10 }}>
                <Text
                  variant="labelSmall"
                  style={{
                    color: Colors.darks.brown,
                    fontWeight: "700",
                    marginBottom: 2,
                  }}
                >
                  {label}
                </Text>
                {items.map((item, i) => (
                  <Text
                    key={i}
                    variant="bodyMedium"
                    style={{ color: Colors.darks.brown }}
                  >
                    • {item}
                  </Text>
                ))}
              </View>
            ) : null;
          })}
          {typeof us.confidence === "string" && (
            <Text
              variant="labelSmall"
              style={{ color: Colors.darks.brown, marginTop: 4 }}
            >
              Confidence: {us.confidence}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};
