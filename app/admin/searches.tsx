import { AdminNavbar } from "@/components/admin/AdminNavbar";
import {
  fetchGiverSynthesizedProfile,
  fetchRecentRuns,
  fetchRecipientSynthesizedProfile,
  fetchSystemPromptById,
  fetchWrapperTemplate,
  type RunSummary,
} from "@/lib/api";
import { Colors } from "@/lib/colors";
import { openLink } from "@/lib/open-link";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Divider,
  Portal,
  Text,
} from "react-native-paper";

const PAGE_SIZE = 50;

// Admin gating (loading / Access Denied) lives in app/admin/_layout.tsx.
type DetailModal =
  | { kind: "protocol"; id: string; version: number | null }
  | { kind: "wrapper"; hash: string }
  | { kind: "recipient"; id: string; name: string }
  | { kind: "giver"; id: string; name: string | null }
  | null;

const SearchesScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<DetailModal>(null);
  const offset = (page - 1) * PAGE_SIZE;

  const runsQuery = useQuery({
    queryKey: queryKeys.recentRuns(page),
    queryFn: () => fetchRecentRuns(PAGE_SIZE, offset),
  });

  const total = runsQuery.data?.total ?? 0;
  const runs = runsQuery.data?.runs ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startNum = total === 0 ? 0 : offset + 1;
  const endNum = Math.min(offset + runs.length, total);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <AdminNavbar title="Gift Generation Runs" />

      <Text variant="bodyMedium" style={styles.summary}>
        {runsQuery.isLoading
          ? "Loading…"
          : total === 0
            ? "No runs recorded yet."
            : `Showing ${startNum}-${endNum} of ${total} runs`}
      </Text>

      {runsQuery.error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.errorText}>
              {(runsQuery.error as Error).message}
            </Text>
          </Card.Content>
        </Card>
      )}

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />

      <View style={styles.runs}>
        {runs.map((run) => (
          <RunCard key={run.run_id} run={run} onOpenModal={setModal} />
        ))}
      </View>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />

      <DetailDialog modal={modal} onDismiss={() => setModal(null)} />
    </ScrollView>
  );
};

const DetailDialog: React.FC<{
  modal: DetailModal;
  onDismiss: () => void;
}> = ({ modal, onDismiss }) => {
  const promptQuery = useQuery({
    queryKey: [
      "systemPromptById",
      modal?.kind === "protocol" ? modal.id : null,
    ],
    queryFn: () =>
      modal?.kind === "protocol"
        ? fetchSystemPromptById(modal.id)
        : Promise.resolve(null),
    enabled: modal?.kind === "protocol",
  });

  const wrapperQuery = useQuery({
    queryKey: [
      "wrapperTemplate",
      modal?.kind === "wrapper" ? modal.hash : null,
    ],
    queryFn: () =>
      modal?.kind === "wrapper"
        ? fetchWrapperTemplate(modal.hash)
        : Promise.resolve(null),
    enabled: modal?.kind === "wrapper",
  });

  const recipientQuery = useQuery({
    queryKey: [
      "recipientSynthProfile",
      modal?.kind === "recipient" ? modal.id : null,
    ],
    queryFn: () =>
      modal?.kind === "recipient"
        ? fetchRecipientSynthesizedProfile(modal.id)
        : Promise.resolve(null),
    enabled: modal?.kind === "recipient",
  });

  const giverQuery = useQuery({
    queryKey: ["giverSynthProfile", modal?.kind === "giver" ? modal.id : null],
    queryFn: () =>
      modal?.kind === "giver"
        ? fetchGiverSynthesizedProfile(modal.id)
        : Promise.resolve(null),
    enabled: modal?.kind === "giver",
  });

  const visible = modal !== null;
  const isLoading =
    (modal?.kind === "protocol" && promptQuery.isLoading) ||
    (modal?.kind === "wrapper" && wrapperQuery.isLoading) ||
    (modal?.kind === "recipient" && recipientQuery.isLoading) ||
    (modal?.kind === "giver" && giverQuery.isLoading);

  let title = "";
  let body = "";
  let meta: string | null = null;

  if (modal?.kind === "protocol") {
    const v = promptQuery.data;
    title = v
      ? `Protocol v${v.version} — ${v.prompt_key}`
      : `Protocol v${modal.version ?? "?"}`;
    body = v?.prompt_text ?? "";
    meta = v
      ? `Created ${new Date(v.created_at).toLocaleString()}${
          v.is_active ? " · ACTIVE" : ""
        }`
      : null;
  } else if (modal?.kind === "wrapper") {
    const w = wrapperQuery.data;
    title = `Wrapper ${modal.hash.slice(0, 12)}…`;
    body = w?.template_text ?? "";
    meta = w
      ? `First seen ${new Date(w.first_seen_at).toLocaleString()}`
      : null;
  } else if (modal?.kind === "recipient") {
    const r = recipientQuery.data;
    title = `Recipient: ${r?.name ?? modal.name}`;
    body = r?.synthesized_profile ?? "(no synthesized profile)";
    meta = null;
  } else if (modal?.kind === "giver") {
    const g = giverQuery.data;
    title = `Giver: ${g?.full_name ?? modal.name ?? "(unnamed)"}`;
    body = g?.synthesized_giver_profile ?? "(no synthesized profile)";
    meta = null;
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScroll}>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <>
                {meta && (
                  <Text variant="bodySmall" style={styles.dialogMeta}>
                    {meta}
                  </Text>
                )}
                <Text style={styles.dialogBody}>{body || "(empty)"}</Text>
              </>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
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

const RunCard: React.FC<{
  run: RunSummary;
  onOpenModal: (m: DetailModal) => void;
}> = ({ run, onOpenModal }) => {
  const ts =
    new Date(run.created_at).toISOString().replace("T", " ").slice(0, 16) +
    " UTC";
  const recipientName = run.recipient?.name ?? "(unknown recipient)";
  const giverName = run.giver?.name ?? "(unknown giver)";
  const occasionType = run.occasion?.occasion_type ?? "—";
  const budget =
    run.budget && (run.budget.min != null || run.budget.max != null)
      ? `$${run.budget.min ?? "?"}-$${run.budget.max ?? "?"}`
      : "no budget";
  const providerLine =
    [run.ai_provider, run.ai_model].filter(Boolean).join("/") ||
    "(provider unknown)";
  const protocolLabel =
    run.protocol_version != null ? `protocol v${run.protocol_version}` : null;
  const wrapperShort = run.wrapper_template_hash
    ? `${run.wrapper_template_hash.slice(0, 8)}…`
    : null;
  const runIdShort = `${run.run_id.slice(0, 8)}…`;

  return (
    <Card style={styles.runCard}>
      <Card.Content>
        <View style={styles.runHeader}>
          <Text variant="titleSmall" style={styles.runTitle}>
            {ts} ·{" "}
            {run.giver ? (
              <Text
                style={styles.headlineLink}
                onPress={() =>
                  onOpenModal({
                    kind: "giver",
                    id: run.giver!.id,
                    name: run.giver!.name,
                  })
                }
              >
                {giverName}
              </Text>
            ) : (
              giverName
            )}
            {" → "}
            {run.recipient ? (
              <Text
                style={styles.headlineLink}
                onPress={() =>
                  onOpenModal({
                    kind: "recipient",
                    id: run.recipient!.id,
                    name: run.recipient!.name,
                  })
                }
              >
                {recipientName}
              </Text>
            ) : (
              recipientName
            )}
            {` (${occasionType}, ${budget})`}
          </Text>
          <Text variant="bodySmall" style={styles.runIdMono}>
            run_id {runIdShort}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text variant="bodySmall" style={styles.metaLine}>
            {providerLine}
          </Text>
          <Text variant="bodySmall" style={styles.metaLine}>
            {" "}
            ·{" "}
          </Text>
          {protocolLabel && run.protocol_prompt_id ? (
            <Pressable
              onPress={() =>
                onOpenModal({
                  kind: "protocol",
                  id: run.protocol_prompt_id!,
                  version: run.protocol_version,
                })
              }
            >
              <Text
                variant="bodySmall"
                style={[styles.metaLine, styles.metaLink]}
              >
                {protocolLabel}
              </Text>
            </Pressable>
          ) : (
            <Text variant="bodySmall" style={styles.metaLine}>
              (no protocol id)
            </Text>
          )}
          <Text variant="bodySmall" style={styles.metaLine}>
            {" "}
            · wrapper{" "}
          </Text>
          {wrapperShort && run.wrapper_template_hash ? (
            <Pressable
              onPress={() =>
                onOpenModal({
                  kind: "wrapper",
                  hash: run.wrapper_template_hash!,
                })
              }
            >
              <Text
                variant="bodySmall"
                style={[styles.metaLine, styles.metaLink]}
              >
                {wrapperShort}
              </Text>
            </Pressable>
          ) : (
            <Text variant="bodySmall" style={styles.metaLine}>
              (no hash)
            </Text>
          )}
        </View>

        <Divider style={styles.divider} />

        <Text variant="labelSmall" style={styles.sectionLabel}>
          SEARCHES ({run.search_queries.length})
        </Text>
        {run.search_queries.length === 0 ? (
          <Text variant="bodySmall" style={styles.empty}>
            (no search queries captured)
          </Text>
        ) : (
          run.search_queries.map((q, i) => (
            <Text
              key={`${run.run_id}-q-${i}`}
              variant="bodySmall"
              style={styles.queryLine}
            >
              • &quot;{q}&quot;
            </Text>
          ))
        )}

        <Text variant="labelSmall" style={styles.sectionLabel}>
          FINAL PICKS ({run.picks.length})
        </Text>
        {run.picks.map((p, i) => {
          const domain = (() => {
            if (!p.link) return null;
            try {
              return new URL(p.link).hostname.replace(/^www\./, "");
            } catch {
              return null;
            }
          })();
          const priceText = p.price != null ? `$${p.price}` : "—";
          return (
            <View key={p.id} style={styles.pickLine}>
              <Text variant="bodySmall">
                {i + 1}.{" "}
                {p.link ? (
                  <Text
                    style={styles.pickLink}
                    onPress={() => {
                      void openLink(p.link!);
                    }}
                  >
                    {p.title}
                  </Text>
                ) : (
                  p.title
                )}
                <Text style={styles.pickMeta}>
                  {"  "}({domain ?? "no link"}, {priceText})
                </Text>
              </Text>
            </View>
          );
        })}
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
  runs: {
    gap: 12,
    marginVertical: 8,
  },
  runCard: {
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  runHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  runTitle: {
    fontWeight: "600",
    flexShrink: 1,
  },
  headlineLink: {
    color: "#0a66c2",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  runIdMono: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    color: "#888",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 2,
  },
  metaLine: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    color: "#666",
  },
  metaLink: {
    color: "#0a66c2",
    textDecorationLine: "underline",
  },
  dialog: {
    maxWidth: 800,
    width: "90%",
    alignSelf: "center",
    borderRadius: 8,
  },
  dialogScroll: {
    maxHeight: 480,
    paddingHorizontal: 0,
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  dialogMeta: {
    color: "#888",
    marginBottom: 8,
  },
  dialogBody: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    // eslint-disable-next-line no-restricted-syntax -- monospace readout; the type scale has no mono token
    fontSize: 12,
    color: Colors.darks.brown,
  },
  divider: {
    marginVertical: 10,
  },
  sectionLabel: {
    marginTop: 10,
    fontWeight: "700",
    color: Colors.darks.brown,
  },
  queryLine: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    color: "#444",
  },
  empty: {
    fontStyle: "italic",
    color: "#aaa",
  },
  pickLine: {
    marginTop: 4,
  },
  pickLink: {
    color: "#0a66c2",
    textDecorationLine: "underline",
  },
  pickMeta: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    color: "#888",
  },
});

export default SearchesScreen;
