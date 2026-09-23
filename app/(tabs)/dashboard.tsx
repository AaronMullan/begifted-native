import { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../lib/colors";
import { Spacing } from "../../lib/spacing";
import { NAV_CONTENT_HEIGHT } from "../../components/BottomNav";
import { useAuth } from "../../hooks/use-auth";
import { useRecipients } from "../../hooks/use-recipients";
import { useOccasions } from "../../hooks/use-occasions";
import { groupHomeOccasions } from "../../utils/home-occasions";
import HomeHeroCard from "../../components/home/HomeHeroCard";
import NextUpCarousel from "../../components/home/NextUpCarousel";
import OnTheHorizonGrid from "../../components/home/OnTheHorizonGrid";
import AddPeopleTile from "../../components/home/AddPeopleTile";
import HomeEmptyState from "../../components/home/HomeEmptyState";
import GradientBackground from "../../components/GradientBackground";
import LoadFailedState from "../../components/LoadFailedState";

/**
 * Flexible vertical gap for the anchored home column, sized by which of the
 * dashboard's three layout modes is active. In the unbounded scroll mode the
 * basis holds: the gap renders at its design value (compressing a column that
 * overflows anyway would cram it without buying a fit). When the dashboard
 * bounds the container to the viewport — only after measuring that compression
 * achieves a no-scroll fit — the negative free space engages flexShrink and
 * the gap compresses toward the comp floor (Erik's "No Clip" comp, 5782:5544).
 * With room to spare it grows to a cap symmetric to that floor, anchoring the
 * column top and bottom; past the cap the column top-anchors.
 */
function FlexGap({
  min,
  design,
  compress,
}: {
  min: number;
  design: number;
  compress: boolean;
}) {
  return (
    <View
      style={{
        flexBasis: design,
        // Yoga weights shrink by basis × flexShrink; normalizing to the
        // compressible range makes every gap give up its share of the
        // overflow proportionally, so none clamps at its floor early and the
        // full compressibleBy is actually recoverable.
        flexShrink: (design - min) / design,
        // Yoga lays these out from minHeight upward (the basis doesn't hold in
        // the unbounded scroll container), so the design value must be the
        // floor there — otherwise the natural-height measurement already sits
        // at the comp floors and the bounded mode has nothing left to recover.
        minHeight: compress ? min : design,
        flexGrow: design - min,
        maxHeight: 2 * design - min,
      }}
    />
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();
  // The rendered nav bar is taller than its 55pt base — it absorbs the
  // home-indicator inset (see BottomNav's container minHeight). Clear the real
  // height so the bottom-anchored column lands exactly homeBottomInset above
  // the nav, not behind it.
  const navClearance = NAV_CONTENT_HEIGHT + Math.max(insets.bottom, 12);
  const {
    data: recipientsData,
    isLoading: loadingRecipients,
    isError: recipientsFailed,
    isFetching: refetchingRecipients,
    refetch: refetchRecipients,
  } = useRecipients();
  const recipients = recipientsData ?? [];
  const { data: occasions = [], isLoading: loadingOccasions } = useOccasions();

  const isLoading = loadingRecipients || loadingOccasions;
  const groups = groupHomeOccasions(occasions);

  // Measured fit-by-compression: the column renders at design gaps first;
  // once its natural height and the viewport are known, a column that
  // overflows at design gaps but fits at the comp floors is bounded to the
  // viewport so the FlexGaps genuinely compress (and scrolling turns off).
  // The natural-height cache is keyed to the occasion set so any data change
  // triggers a fresh measure pass at design gaps.
  const [viewportH, setViewportH] = useState(0);
  const [measured, setMeasured] = useState<{
    sig: string;
    naturalH: number;
  } | null>(null);
  const sig = occasions.map((o) => o.id).join(",");
  const naturalH = measured?.sig === sig ? measured.naturalH : null;
  const compressibleBy =
    (groups.hero ? Spacing.moduleStackGap - Spacing.moduleStackGapMin : 0) +
    (groups.nextUp.length > 0
      ? Spacing.heroToSectionGap - Spacing.heroToSectionGapMin
      : 0) +
    (groups.horizon.length > 0
      ? Spacing.sectionGap - Spacing.sectionGapMin
      : 0);
  const fitsCompressed =
    naturalH !== null &&
    viewportH > 0 &&
    naturalH > viewportH &&
    naturalH - compressibleBy <= viewportH;

  // `sig` can't see content that grows after measuring (Dynamic Type, a
  // refetched name wrapping), and bounded mode ignores onContentSizeChange. So
  // watch where the column actually ends: past the content box's inner bottom,
  // the gaps have nothing left to give — drop the cache to re-measure at design
  // gaps, which re-bounds with the new height or falls back to scrolling. The
  // column's own height can't signal this; bounded mode caps it at the
  // viewport. The 1pt slack keeps sub-pixel rounding from re-measuring forever.
  const handleColumnEndLayout = (e: LayoutChangeEvent) => {
    if (!fitsCompressed) return;
    const innerBottom = viewportH - navClearance - Spacing.homeBottomInset;
    if (e.nativeEvent.layout.y > innerBottom + 1) setMeasured(null);
  };

  if (authLoading) {
    return (
      <View style={styles.container}>
        <GradientBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.black} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <GradientBackground />
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.signInTitle}>
            Dashboard
          </Text>
          <Text variant="bodyLarge">
            Please sign in to view your dashboard.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading && recipients.length === 0 && occasions.length === 0) {
    return (
      <View style={styles.container}>
        <GradientBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.black} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading dashboard...
          </Text>
        </View>
      </View>
    );
  }

  // A failed fetch leaves `recipients` empty too, which the welcome state below
  // would report as "you have nobody yet" — onboarding shown to a user with a
  // full account. Test the raw value, not the defaulted one: a query that
  // errored on a later refetch keeps the data it already had, and a genuinely
  // empty account must still get the welcome rather than a load failure.
  if (recipientsFailed && recipientsData === undefined) {
    return (
      <View style={styles.container}>
        <GradientBackground />
        <View style={styles.loadingContainer}>
          <LoadFailedState
            message="Couldn't load your people."
            onRetry={refetchRecipients}
            retrying={refetchingRecipients}
          />
        </View>
      </View>
    );
  }

  // Post-onboarding users with nobody added yet get the welcome empty state
  // instead of a bare dashboard.
  if (recipients.length === 0) {
    return (
      <View style={styles.container}>
        <GradientBackground />
        <HomeEmptyState />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: navClearance },
          // Bounding the container to the viewport is what turns compression
          // on: it creates the negative free space the FlexGaps shrink into.
          // Unbounded (flexGrow) rendering measures the natural height first.
          fitsCompressed ? { height: viewportH } : { flexGrow: 1 },
        ]}
        onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          // In the bounded mode the reported height is the viewport, not the
          // column's natural height — keep the cached measurement instead.
          if (!fitsCompressed) setMeasured({ sig, naturalH: h });
        }}
        scrollEnabled={!fitsCompressed}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        bounces={false}
      >
        <View style={styles.content}>
          {groups.hero && (
            <>
              <HomeHeroCard occasion={groups.hero} />
              <FlexGap
                min={Spacing.moduleStackGapMin}
                design={Spacing.moduleStackGap}
                compress={fitsCompressed}
              />
            </>
          )}
          <AddPeopleTile />
          {groups.nextUp.length > 0 && (
            <>
              <FlexGap
                min={Spacing.heroToSectionGapMin}
                design={Spacing.heroToSectionGap}
                compress={fitsCompressed}
              />
              <NextUpCarousel occasions={groups.nextUp} />
            </>
          )}
          {groups.horizon.length > 0 && (
            <>
              <FlexGap
                min={Spacing.sectionGapMin}
                design={Spacing.sectionGap}
                compress={fitsCompressed}
              />
              <OnTheHorizonGrid occasions={groups.horizon} />
            </>
          )}
          {!groups.hero && (
            <Text variant="bodyLarge" style={styles.emptyText}>
              No upcoming occasions yet.
            </Text>
          )}
          <View onLayout={handleColumnEndLayout} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    backgroundColor: "transparent",
    alignItems: "center",
  },
  content: {
    maxWidth: 800,
    width: "100%",
    // Stretch to the viewport so the FlexGap spacers can distribute leftover
    // height (top/bottom-anchored column); vertical gaps live in the spacers,
    // not a column `gap`.
    flexGrow: 1,
    // Lets the bounded mode cap the column at the viewport so its negative
    // free space reaches the FlexGaps instead of overflowing under the nav.
    flexShrink: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Spacing.homeBottomInset,
    backgroundColor: "transparent",
    alignSelf: "stretch",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.grays.text,
  },
  signInTitle: {
    marginBottom: 8,
    color: Colors.black,
  },
  emptyText: {
    color: Colors.black,
    opacity: 0.7,
    textAlign: "center",
    paddingVertical: 40,
  },
});
