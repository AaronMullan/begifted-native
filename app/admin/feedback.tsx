import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { AdminTheme } from "@/lib/admin-theme";
import { fetchFeedbackDashboard, type RawFeedbackItem } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Card, Divider, Text } from "react-native-paper";

// Admin gating (loading / Access Denied) lives in app/admin/_layout.tsx.

function formatTs(iso: string): string {
  // Upstream timestamps aren't guaranteed present; an empty/invalid value would
  // make new Date(...).toISOString() throw during render and take the whole app
  // to the root crash screen. Fail soft instead.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

const FeedbackScreen: React.FC = () => {
  const query = useQuery({
    queryKey: queryKeys.feedbackTickets,
    queryFn: fetchFeedbackDashboard,
  });

  const items = query.data?.rawFeedback ?? [];
  const withTicket = items.filter((i) => i.jiraKey).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <AdminNavbar
        title="Feedback"
        subtitle="What users are telling us, and the tickets it turned into."
      />

      <Text variant="bodyMedium" style={styles.summary}>
        {query.isLoading
          ? "Loading…"
          : items.length === 0
            ? "No feedback recorded yet."
            : `${items.length} feedback items · ${withTicket} with a ticket`}
      </Text>

      {query.error && (
        <Card mode="contained" style={styles.errorCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.errorText}>
              {(query.error as Error).message}
            </Text>
          </Card.Content>
        </Card>
      )}

      {[query.data?.errors.jira, query.data?.errors.sentry]
        .filter((m): m is string => Boolean(m))
        .map((m) => (
          <Card key={m} mode="contained" style={styles.warnCard}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.warnText}>
                {m}
              </Text>
            </Card.Content>
          </Card>
        ))}

      <View style={styles.items}>
        {items.map((item) => (
          <FeedbackCard key={item.id} item={item} />
        ))}
      </View>

      {query.isLoading && <ActivityIndicator style={styles.loader} />}
    </ScrollView>
  );
};

const FeedbackCard: React.FC<{ item: RawFeedbackItem }> = ({ item }) => {
  const name = item.reporter ?? "(anonymous)";
  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleSmall" style={styles.cardTitle}>
            {name}
          </Text>
          <Text variant="bodySmall" style={styles.tsMono}>
            {formatTs(item.createdAt)}
          </Text>
        </View>

        <Divider style={styles.divider} />

        <Text variant="bodyMedium" style={styles.message}>
          {item.message}
        </Text>

        <View style={styles.statusRow}>
          <TicketStatus item={item} />
        </View>
      </Card.Content>
    </Card>
  );
};

// The ticket a feedback item spawned, resolved to its live status. Tapping the
// chip opens the issue in Jira. Feedback that was handled in Sentry but has no
// mapping row yet (e.g. before the backfill runs) reads as "Triaged"; untouched
// feedback reads as "Not yet triaged".
const TicketStatus: React.FC<{ item: RawFeedbackItem }> = ({ item }) => {
  if (item.jiraKey) {
    const label = item.statusName
      ? `${item.jiraKey} · ${item.statusName}`
      : item.jiraKey;
    if (item.jiraUrl) {
      const url = item.jiraUrl;
      return (
        <Pressable onPress={() => Linking.openURL(url)}>
          <View style={styles.ticketTag}>
            <Text variant="labelSmall" style={styles.ticketTagText}>
              {label}
            </Text>
          </View>
        </Pressable>
      );
    }
    return (
      <View style={styles.ticketTag}>
        <Text variant="labelSmall" style={styles.ticketTagText}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <Text variant="bodySmall" style={styles.untriaged}>
      {item.resolved ? "Triaged" : "Not yet triaged"}
    </Text>
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
  warnCard: {
    marginBottom: 12,
    backgroundColor: "rgba(200,160,60,0.16)",
    borderRadius: 8,
  },
  warnText: {
    color: AdminTheme.muted,
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
  message: {
    color: AdminTheme.text,
    marginTop: 2,
  },
  statusRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  ticketTag: {
    alignSelf: "flex-start",
    backgroundColor: AdminTheme.navActive,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ticketTagText: {
    color: AdminTheme.text,
    fontWeight: "700",
  },
  untriaged: {
    color: AdminTheme.faint,
    fontStyle: "italic",
  },
});

export default FeedbackScreen;
