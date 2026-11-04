import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { AdminTheme } from "@/lib/admin-theme";
import {
  fetchBetaFeedback,
  type BetaCheckInScreen,
  type BetaFeedbackRow,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Divider,
  SegmentedButtons,
  Text,
} from "react-native-paper";

// Admin gating (loading / Access Denied) lives in app/admin/_layout.tsx.

type ScreenFilter = "all" | BetaCheckInScreen;

const SCREEN_ORDER: BetaCheckInScreen[] = [
  "onboarding",
  "first_recipient",
  "first_gift_set",
];

const SCREEN_LABELS: Record<BetaCheckInScreen, string> = {
  onboarding: "Onboarding",
  first_recipient: "First recipient",
  first_gift_set: "First gift set",
};

type QuestionLabels = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
};

// The stored `responses` blob only holds the stable question ids and option
// values; this is the copy the check-ins showed for each, so past answers stay
// readable.
const QUESTIONS: Record<BetaCheckInScreen, QuestionLabels[]> = {
  onboarding: [
    {
      id: "felt_easy",
      label: "Did that feel easy?",
      options: [
        { value: "natural_and_easy", label: "Natural and easy" },
        { value: "a_little_open_ended", label: "A little open-ended" },
        { value: "form_would_be_easier", label: "A form would be easier" },
      ],
    },
    {
      id: "used_voice",
      label: "Did you use voice-to-text?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "no_might_next_time", label: "No, but I might next time" },
      ],
    },
  ],
  first_recipient: [
    {
      id: "easy_to_describe",
      label: "Did the questions make it easy to describe them?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
  ],
  first_gift_set: [
    {
      id: "felt_right",
      label: "Did the ideas feel right for this person?",
      options: [
        { value: "spot_on", label: "Spot on" },
        { value: "close", label: "Close" },
        { value: "off_base", label: "Off-base" },
      ],
    },
    {
      id: "stronger_if",
      label: "What would have made them stronger?",
      options: [
        { value: "more_specific_to_them", label: "More specific to them" },
        { value: "better_price_fit", label: "Better price fit" },
        { value: "more_their_taste", label: "More their taste" },
        { value: "other", label: "Other" },
      ],
    },
  ],
};

function questionLabel(screen: BetaCheckInScreen, questionId: string): string {
  const question = QUESTIONS[screen].find((q) => q.id === questionId);
  return question?.label ?? questionId;
}

function answerLabels(
  screen: BetaCheckInScreen,
  questionId: string,
  value: string | string[]
): string {
  const question = QUESTIONS[screen].find((q) => q.id === questionId);
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((v) => question?.options.find((o) => o.value === v)?.label ?? v)
    .join(", ");
}

const BetaFeedbackScreen: React.FC = () => {
  const [filter, setFilter] = useState<ScreenFilter>("all");

  const feedbackQuery = useQuery({
    queryKey: queryKeys.betaFeedback,
    queryFn: fetchBetaFeedback,
  });

  const allRows = feedbackQuery.data ?? [];
  const rows =
    filter === "all" ? allRows : allRows.filter((r) => r.screen === filter);

  const countByScreen = SCREEN_ORDER.reduce<Record<string, number>>(
    (acc, s) => {
      acc[s] = allRows.filter((r) => r.screen === s).length;
      return acc;
    },
    {}
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <AdminNavbar
        title="Beta Check-ins"
        subtitle="Responses from the in-app beta UX check-in cards."
      />

      <Text variant="bodyMedium" style={styles.summary}>
        {feedbackQuery.isLoading
          ? "Loading…"
          : allRows.length === 0
            ? "No check-in responses recorded yet."
            : `${allRows.length} responses · ${countByScreen.onboarding ?? 0} onboarding · ${countByScreen.first_recipient ?? 0} first recipient · ${countByScreen.first_gift_set ?? 0} first gift set`}
      </Text>

      {feedbackQuery.error && (
        <Card mode="contained" style={styles.errorCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.errorText}>
              {(feedbackQuery.error as Error).message}
            </Text>
          </Card.Content>
        </Card>
      )}

      <SegmentedButtons
        value={filter}
        onValueChange={(v) => setFilter(v as ScreenFilter)}
        style={styles.filter}
        buttons={[
          { value: "all", label: "All" },
          { value: "onboarding", label: "Onboarding" },
          { value: "first_recipient", label: "Recipient" },
          { value: "first_gift_set", label: "Gift set" },
        ]}
      />

      {!feedbackQuery.isLoading && rows.length === 0 && allRows.length > 0 && (
        <Text variant="bodySmall" style={styles.emptyFilter}>
          No responses for this check-in.
        </Text>
      )}

      <View style={styles.items}>
        {rows.map((row) => (
          <FeedbackCard key={row.id} row={row} />
        ))}
      </View>

      {feedbackQuery.isLoading && <ActivityIndicator style={styles.loader} />}
    </ScrollView>
  );
};

const FeedbackCard: React.FC<{ row: BetaFeedbackRow }> = ({ row }) => {
  const ts =
    new Date(row.created_at).toISOString().replace("T", " ").slice(0, 16) +
    " UTC";
  const name = row.giver_name ?? "(unnamed tester)";
  const answers = Object.entries(row.responses);

  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.screenTag}>
              <Text variant="labelSmall" style={styles.screenTagText}>
                {SCREEN_LABELS[row.screen]}
              </Text>
            </View>
            <Text variant="titleSmall" style={styles.cardTitle}>
              {name}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.tsMono}>
            {ts}
          </Text>
        </View>

        <Divider style={styles.divider} />

        {answers.length === 0 ? (
          <Text variant="bodySmall" style={styles.empty}>
            (no structured answers)
          </Text>
        ) : (
          answers.map(([questionId, value]) => (
            <View key={questionId} style={styles.qa}>
              <Text variant="bodySmall" style={styles.question}>
                {questionLabel(row.screen, questionId)}
              </Text>
              <Text variant="bodyMedium" style={styles.answer}>
                {answerLabels(row.screen, questionId, value)}
              </Text>
            </View>
          ))
        )}

        {row.free_text ? (
          <View style={styles.freeText}>
            <Text variant="labelSmall" style={styles.freeTextLabel}>
              FREE TEXT
            </Text>
            <Text variant="bodyMedium" style={styles.freeTextBody}>
              “{row.free_text}”
            </Text>
          </View>
        ) : null}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminTheme.screenBg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },
  summary: {
    marginBottom: 12,
    color: AdminTheme.muted,
  },
  errorCard: {
    marginBottom: 12,
    backgroundColor: "rgba(173,75,95,0.18)",
    borderRadius: 8,
  },
  errorText: {
    color: AdminTheme.bad,
  },
  filter: {
    marginBottom: 12,
  },
  emptyFilter: {
    color: AdminTheme.faint,
    fontStyle: "italic",
    marginBottom: 8,
  },
  loader: {
    marginTop: 24,
  },
  items: {
    gap: 12,
    marginVertical: 4,
  },
  card: {
    borderRadius: 8,
    backgroundColor: AdminTheme.panel,
    borderWidth: 1,
    borderColor: AdminTheme.border,
  },
  cardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  screenTag: {
    backgroundColor: AdminTheme.navActive,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  screenTagText: {
    color: AdminTheme.text,
    fontWeight: "700",
  },
  cardTitle: {
    fontWeight: "600",
    flexShrink: 1,
    color: AdminTheme.textStrong,
  },
  tsMono: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    color: AdminTheme.muted,
  },
  divider: {
    marginVertical: 10,
    backgroundColor: AdminTheme.border,
  },
  qa: {
    marginBottom: 8,
  },
  question: {
    color: AdminTheme.muted,
  },
  answer: {
    color: AdminTheme.text,
    marginTop: 1,
    fontWeight: "600",
  },
  empty: {
    fontStyle: "italic",
    color: AdminTheme.faint,
  },
  freeText: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.borderSoft,
  },
  freeTextLabel: {
    fontWeight: "700",
    color: AdminTheme.faint,
    marginBottom: 3,
  },
  freeTextBody: {
    color: AdminTheme.text,
    fontStyle: "italic",
  },
});

export default BetaFeedbackScreen;
