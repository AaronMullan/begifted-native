import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { AdminTheme } from "@/lib/admin-theme";
import {
  fetchFeedbackDashboard,
  type FeedbackTicket,
  type RawFeedbackItem,
  type TicketStatusCategory,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Divider,
  SegmentedButtons,
  Text,
} from "react-native-paper";

// Admin gating (loading / Access Denied) lives in app/admin/_layout.tsx.

type FeedbackView = "raw" | "tickets";

const STATUS_ORDER: TicketStatusCategory[] = ["todo", "in_progress", "done"];

const STATUS_LABELS: Record<TicketStatusCategory, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  unknown: "Other",
};

const SOURCE_LABELS: Record<FeedbackTicket["source"], string> = {
  "user-feedback": "User",
  "team-feedback": "Team",
  other: "Other",
};

function formatTs(iso: string): string {
  // Upstream timestamps aren't guaranteed present; an empty/invalid value would
  // make new Date(...).toISOString() throw during render and take the whole app
  // to the root crash screen. Fail soft instead.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

const FeedbackScreen: React.FC = () => {
  const [view, setView] = useState<FeedbackView>("raw");

  const query = useQuery({
    queryKey: queryKeys.feedbackTickets,
    queryFn: fetchFeedbackDashboard,
  });

  const raw = query.data?.rawFeedback ?? [];
  const tickets = query.data?.tickets ?? [];

  const untriaged = raw.filter((r) => !r.jiraKey).length;

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
          : `${raw.length} feedback items · ${untriaged} not yet triaged · ${tickets.length} tickets`}
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

      <SegmentedButtons
        value={view}
        onValueChange={(v) => setView(v as FeedbackView)}
        style={styles.filter}
        buttons={[
          { value: "raw", label: "Raw feedback" },
          { value: "tickets", label: "Tickets" },
        ]}
      />

      {query.isLoading && <ActivityIndicator style={styles.loader} />}

      {!query.isLoading && view === "raw" && <RawFeedbackList items={raw} />}

      {!query.isLoading && view === "tickets" && (
        <TicketList tickets={tickets} />
      )}
    </ScrollView>
  );
};

const RawFeedbackList: React.FC<{ items: RawFeedbackItem[] }> = ({ items }) => {
  if (items.length === 0) {
    return (
      <Text variant="bodySmall" style={styles.emptyFilter}>
        No feedback recorded yet.
      </Text>
    );
  }
  return (
    <View style={styles.items}>
      {items.map((item) => (
        <RawFeedbackCard key={item.id} item={item} />
      ))}
    </View>
  );
};

const RawFeedbackCard: React.FC<{ item: RawFeedbackItem }> = ({ item }) => {
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
          {item.jiraKey ? (
            <View style={styles.ticketTag}>
              <Text variant="labelSmall" style={styles.ticketTagText}>
                {item.jiraKey}
                {item.statusName ? ` · ${item.statusName}` : ""}
              </Text>
            </View>
          ) : (
            <Text variant="bodySmall" style={styles.untriaged}>
              Not yet triaged
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const TicketList: React.FC<{ tickets: FeedbackTicket[] }> = ({ tickets }) => {
  if (tickets.length === 0) {
    return (
      <Text variant="bodySmall" style={styles.emptyFilter}>
        No feedback tickets found.
      </Text>
    );
  }

  const grouped = STATUS_ORDER.map((cat) => ({
    cat,
    rows: tickets.filter((t) => t.statusCategory === cat),
  }));
  // Anything Jira didn't map to a known category still deserves to show.
  const otherRows = tickets.filter(
    (t) => !STATUS_ORDER.includes(t.statusCategory)
  );
  if (otherRows.length > 0) {
    grouped.push({ cat: "unknown", rows: otherRows });
  }

  return (
    <View style={styles.groups}>
      {grouped
        .filter((g) => g.rows.length > 0)
        .map((g) => (
          <View key={g.cat}>
            <Text variant="labelLarge" style={styles.groupHeader}>
              {STATUS_LABELS[g.cat]} · {g.rows.length}
            </Text>
            <View style={styles.items}>
              {g.rows.map((t) => (
                <TicketCard key={t.key} ticket={t} />
              ))}
            </View>
          </View>
        ))}
    </View>
  );
};

const TicketCard: React.FC<{ ticket: FeedbackTicket }> = ({ ticket }) => (
  <Card
    mode="contained"
    style={styles.card}
    onPress={() => Linking.openURL(ticket.url)}
  >
    <Card.Content>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.sourceTag}>
            <Text variant="labelSmall" style={styles.sourceTagText}>
              {SOURCE_LABELS[ticket.source]}
            </Text>
          </View>
          <Text variant="labelSmall" style={styles.ticketKey}>
            {ticket.key}
          </Text>
        </View>
        <Text variant="bodySmall" style={styles.tsMono}>
          {ticket.statusName}
        </Text>
      </View>

      <Text variant="bodyMedium" style={styles.message}>
        {ticket.summary}
      </Text>

      <Text variant="bodySmall" style={styles.meta}>
        {[ticket.priority, ticket.assignee ?? "Unassigned"]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </Card.Content>
  </Card>
);

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
  groups: {
    gap: 18,
  },
  groupHeader: {
    color: AdminTheme.textStrong,
    fontWeight: "700",
    marginBottom: 8,
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
  meta: {
    color: AdminTheme.muted,
    marginTop: 8,
  },
  statusRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  ticketTag: {
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
  sourceTag: {
    backgroundColor: AdminTheme.navActive,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceTagText: {
    color: AdminTheme.text,
    fontWeight: "700",
  },
  ticketKey: {
    color: AdminTheme.muted,
    fontWeight: "700",
  },
});

export default FeedbackScreen;
