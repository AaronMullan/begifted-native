import { View, ScrollView, StyleSheet, Share } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import { Spacing } from "../../../lib/spacing";
import {
  INVITE_LIMIT,
  createInvite,
  inviteLink,
  markInviteSent,
} from "../../../lib/api";
import type { Invite } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";
import { useAuth } from "../../../hooks/use-auth";
import { useAppConfig } from "../../../hooks/use-app-config";
import { useSentInvites } from "../../../hooks/use-invites";
import { showSnackbar } from "../../../components/GlobalSnackbar";
import { PrimaryCta } from "../../../components/PrimaryCta";
import GradientBackground from "../../../components/GradientBackground";
import StateMessage from "../../../components/StateMessage";
import { StateCopy } from "../../../lib/state-copy";

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type InviteRowProps = {
  invite: Invite;
};

const InviteRow: React.FC<InviteRowProps> = ({ invite }) => (
  <View style={styles.row}>
    <Text style={styles.rowDate}>{formatDay(invite.sent_at!)}</Text>
    <Text style={styles.rowStatus}>
      {invite.accepted_at ? "Joined" : "Sent"}
    </Text>
  </View>
);

export default function InviteSettings() {
  const insets = useSafeAreaInsets();
  const headerSpacerHeight = Math.max(HEADER_HEIGHT, insets.top + 60);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const configQuery = useAppConfig();
  const invitesQuery = useSentInvites(user?.id);
  const [sharing, setSharing] = useState(false);

  const invites = invitesQuery.data ?? [];
  const left = Math.max(0, INVITE_LIMIT - invites.length);

  const handleShare = async () => {
    if (!user) return;
    setSharing(true);
    try {
      const invite = await createInvite();
      const result = await Share.share({
        message: `Here's an invite to the BeGifted beta: ${inviteLink(invite.code)}`,
      });
      // A dismissed sheet leaves the invite pending; the next share reuses it.
      if (result.action === Share.sharedAction) {
        await markInviteSent(invite.id);
      }
    } catch (err) {
      Sentry.captureException(
        err instanceof Error ? err : new Error(String(err)),
        { tags: { feature: "invites" } }
      );
      showSnackbar(StateCopy.saveFailed("your invite"));
    } finally {
      setSharing(false);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invites(user.id),
      });
    }
  };

  const header = (
    <View style={styles.header}>
      <IconButton
        icon="chevron-left"
        size={20}
        iconColor={Colors.brand.darkTeal}
        onPress={() => router.back()}
        style={styles.backButton}
      />
      <Text style={styles.title}>Invite friends</Text>
    </View>
  );

  let body: React.ReactNode;
  if (configQuery.isLoading || invitesQuery.isLoading) {
    body = (
      <StateMessage loading message={StateCopy.inProgress("your invites")} />
    );
  } else if (!configQuery.data?.invites_enabled) {
    body = <StateMessage message={StateCopy.disabled("Inviting friends")} />;
  } else if (invitesQuery.isError) {
    body = (
      <StateMessage
        message={StateCopy.loadFailed("your invites")}
        onRetry={() => void invitesQuery.refetch()}
        retrying={invitesQuery.isRefetching}
      />
    );
  } else {
    body = (
      <>
        <Text style={styles.intro}>
          Bring a few people into the beta. Each link works once.
        </Text>

        <Text style={styles.count}>
          {left} of {INVITE_LIMIT} invites left
        </Text>

        {invites.length > 0 && (
          <View style={styles.list}>
            <View style={styles.divider} />
            {invites.map((invite) => (
              <InviteRow key={invite.id} invite={invite} />
            ))}
            <View style={styles.divider} />
          </View>
        )}

        {left === 0 && (
          <Text style={styles.allOut}>All five invites are out.</Text>
        )}

        <PrimaryCta
          label="Share an invite"
          state={sharing ? "loading" : "idle"}
          disabled={left === 0}
          onPress={handleShare}
          style={styles.shareButton}
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <GradientBackground />
      <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {header}
          {body}
        </View>
      </ScrollView>
    </View>
  );
}

// Follows the Contact Us sub-page (Figma 4518:4038): chevron + h2 header,
// mediumTeal intro copy, centered darkTeal pill; the sent list borrows the
// Settings rows' white hairline dividers.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerSpacer: {
    height: HEADER_HEIGHT,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: BOTTOM_NAV_HEIGHT + 40,
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: Spacing.sectionHeadInset,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
    // IconButton pads its 44pt tap target; pull it back so the chevron sits
    // on the gutter line.
    marginLeft: -12,
  },
  backButton: {
    margin: 0,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  intro: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
    marginBottom: 24,
  },
  count: {
    ...Typography.drawerTitle,
    color: Colors.brand.darkTeal,
  },
  list: {
    marginTop: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.white,
  },
  row: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowDate: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
  },
  rowStatus: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
  },
  allOut: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
    marginTop: 24,
  },
  shareButton: {
    marginTop: Spacing.fieldToCta,
  },
});
