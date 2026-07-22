import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { fetchOutboundClicks, type OutboundClickRow } from "@/lib/api";
import { Colors } from "@/lib/colors";
import { openLink } from "@/lib/open-link";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";

const PAGE_SIZE = 50;

// Admin gating (loading / Access Denied) lives in app/admin/_layout.tsx.
const ClicksScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const offset = (page - 1) * PAGE_SIZE;

  const clicksQuery = useQuery({
    queryKey: queryKeys.outboundClicks(page),
    queryFn: () => fetchOutboundClicks(PAGE_SIZE, offset),
  });

  const total = clicksQuery.data?.total ?? 0;
  const clicks = clicksQuery.data?.clicks ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startNum = total === 0 ? 0 : offset + 1;
  const endNum = Math.min(offset + clicks.length, total);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <AdminNavbar title="Outbound Product Clicks" />

      <Text variant="bodyMedium" style={styles.summary}>
        {clicksQuery.isLoading
          ? "Loading…"
          : total === 0
            ? "No outbound clicks recorded yet."
            : `Showing ${startNum}-${endNum} of ${total} clicks`}
      </Text>

      {clicksQuery.error && (
        <Card mode="contained" style={styles.errorCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.errorText}>
              {(clicksQuery.error as Error).message}
            </Text>
          </Card.Content>
        </Card>
      )}

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />

      <View style={styles.items}>
        {clicks.map((click) => (
          <ClickCard key={click.id} click={click} />
        ))}
      </View>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </ScrollView>
  );
};

const Pagination: React.FC<{
  page: number;
  totalPages: number;
  setPage: (n: number) => void;
}> = ({ page, totalPages, setPage }) => {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.pagination}>
      <Button
        mode="outlined"
        compact
        disabled={page <= 1}
        onPress={() => setPage(page - 1)}
        icon="chevron-left"
      >
        Previous
      </Button>
      <Text variant="bodySmall" style={styles.pageIndicator}>
        Page {page} of {totalPages}
      </Text>
      <Button
        mode="outlined"
        compact
        disabled={page >= totalPages}
        onPress={() => setPage(page + 1)}
        icon="chevron-right"
        contentStyle={styles.nextContent}
      >
        Next
      </Button>
    </View>
  );
};

const ClickCard: React.FC<{ click: OutboundClickRow }> = ({ click }) => {
  const ts =
    new Date(click.created_at).toISOString().replace("T", " ").slice(0, 16) +
    " UTC";
  const recipientName = click.recipient?.name ?? "(unknown recipient)";
  const giftTitle = click.gift_suggestion?.title ?? "(gift removed)";
  const domain = click.retailer_domain ?? "(unknown)";
  const platform = click.platform ?? "—";

  return (
    <Card mode="contained" style={styles.clickCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleSmall" style={styles.cardTitle}>
            {recipientName}
          </Text>
          <Text variant="bodySmall" style={styles.tsMono}>
            {ts}
          </Text>
        </View>

        <Text variant="bodyMedium" style={styles.giftTitle}>
          <Text
            style={styles.giftLink}
            onPress={() => {
              void openLink(click.product_url);
            }}
          >
            {giftTitle}
          </Text>
        </Text>

        <View style={styles.metaRow}>
          <Text variant="bodySmall" style={styles.metaLine}>
            {domain}
          </Text>
          <Text variant="bodySmall" style={styles.metaLine}>
            {"  ·  "}
            {platform}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
    color: Colors.darks.brown,
  },
  errorCard: {
    marginBottom: 12,
    backgroundColor: "#fee",
    borderRadius: 8,
  },
  errorText: {
    color: "#900",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  pageIndicator: {
    color: Colors.darks.brown,
  },
  nextContent: {
    flexDirection: "row-reverse",
  },
  items: {
    gap: 12,
    marginVertical: 8,
  },
  clickCard: {
    borderRadius: 8,
    backgroundColor: Colors.white,
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
  },
  tsMono: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    color: "#888",
  },
  giftTitle: {
    marginTop: 4,
  },
  giftLink: {
    color: "#0a66c2",
    textDecorationLine: "underline",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 4,
  },
  metaLine: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    color: "#666",
  },
});

export default ClicksScreen;
