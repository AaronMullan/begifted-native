import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { AdminTheme } from "@/lib/admin-theme";
import {
  fetchFeedbackDashboard,
  type RawFeedbackItem,
  type TicketStatusCategory,
} from "@/lib/api";
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

// react-native-web renders a Text with an `href` as a real <a> element, but the
// react-native core types don't include `href`. This cast exposes it for the
// per-item deep-link anchor without leaking `any` or spreading props. On native
// the prop is inert.
const AnchorText = Text as React.ComponentType<
  React.ComponentProps<typeof Text> & { href?: string }
>;

function formatTs(iso: string): string {
  // Upstream timestamps aren't guaranteed present; an empty/invalid value would
  // make new Date(...).toISOString() throw during render and take the whole app
  // to the root crash screen. Fail soft instead.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

type ChipColor = { bg: string; fg: string };

// Per-status chip colors, keyed by the exact Jira status name (lowercased) so
// each workflow state reads at a glance. Falls back to statusCategory for any
// status not listed here (e.g. a future one). "Triage" is included ahead of the
// workflow adding it, so it lights up the moment tickets land there.
const STATUS_COLORS: Record<string, ChipColor> = {
  triage: { bg: "rgba(216,184,105,0.22)", fg: "#E7CE8E" }, // gold — needs sorting
  "to do": { bg: "rgba(143,168,175,0.18)", fg: "#B9C9CE" }, // neutral — not started
  blocked: { bg: "rgba(231,154,168,0.20)", fg: "#E79AA8" }, // rose — stuck
  "in progress": { bg: "rgba(43,163,184,0.24)", fg: "#6FD0E0" }, // cyan — active
  "ready for deploy": { bg: "rgba(4,105,126,0.42)", fg: "#8FE3D3" },
  done: { bg: "rgba(127,212,196,0.20)", fg: "#7FD4C4" }, // teal — shipped
  declined: { bg: "rgba(255,255,255,0.05)", fg: "#7E999F" }, // muted — won't do
};

const CATEGORY_COLORS: Record<TicketStatusCategory, ChipColor> = {
  todo: STATUS_COLORS["to do"],
  in_progress: STATUS_COLORS["in progress"],
  done: STATUS_COLORS.done,
  unknown: STATUS_COLORS["to do"],
};

function statusChipColor(
  statusName: string | null,
  category: TicketStatusCategory | null
): ChipColor {
  const key = (statusName ?? "").toLowerCase();
  return STATUS_COLORS[key] ?? CATEGORY_COLORS[category ?? "unknown"];
}

// The DEV workflow has no "Triage" status, so feedback tickets sit in "To Do"
// with the user-feedback label as the de-facto triage queue. Every ticket shown
// here is a user-feedback ticket, so present "To Do" as "Triage" (the label and
// gold color both follow from the mapped name).
function displayStatus(statusName: string | null): string | null {
  if (!statusName) return null;
  return statusName.toLowerCase() === "to do" ? "Triage" : statusName;
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
  // Stable DOM id (web) so each item is addressable as /admin/feedback#<anchorId>.
  const anchorId = `feedback-${item.id}`;
  return (
    <View nativeID={anchorId}>
      <Card mode="contained" style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleSmall" style={styles.cardTitle}>
              {name}
            </Text>
            <View style={styles.headerRight}>
              <AnchorText
                variant="bodySmall"
                href={`#${anchorId}`}
                accessibilityLabel="Link to this feedback item"
                style={styles.anchorLink}
              >
                #
              </AnchorText>
              <Text variant="bodySmall" style={styles.tsMono}>
                {formatTs(item.createdAt)}
              </Text>
            </View>
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
    </View>
  );
};

// The ticket a feedback item spawned, resolved to its live status. Tapping the
// chip opens the issue in Jira. Feedback that was handled in Sentry but has no
// mapping row yet (e.g. before the backfill runs) reads as "Triaged"; untouched
// feedback reads as "Not yet triaged".
const TicketStatus: React.FC<{ item: RawFeedbackItem }> = ({ item }) => {
  if (!item.jiraKey) {
    return (
      <Text variant="bodySmall" style={styles.untriaged}>
        {item.resolved ? "Triaged" : "Not yet triaged"}
      </Text>
    );
  }

  const shown = displayStatus(item.statusName);
  const c = statusChipColor(shown, item.statusCategory);
  const label = shown ? `${item.jiraKey} · ${shown}` : item.jiraKey;
  const chip = (
    <View style={[styles.ticketTag, { backgroundColor: c.bg }]}>
      <Text
        variant="labelSmall"
        style={[styles.ticketTagText, { color: c.fg }]}
      >
        {label}
      </Text>
    </View>
  );

  if (item.jiraUrl) {
    const url = item.jiraUrl;
    return <Pressable onPress={() => Linking.openURL(url)}>{chip}</Pressable>;
  }
  return chip;
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  anchorLink: {
    color: AdminTheme.faint,
    fontWeight: "700",
    textDecorationLine: "none",
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
    // backgroundColor is set per status via statusChipColor.
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ticketTagText: {
    // color is set per status via statusChipColor.
    fontWeight: "700",
  },
  untriaged: {
    color: AdminTheme.faint,
    fontStyle: "italic",
  },
});

export default FeedbackScreen;
