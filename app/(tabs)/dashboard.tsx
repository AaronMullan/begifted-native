import { View, StyleSheet, ScrollView } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Spacing } from "../../lib/spacing";
import { BOTTOM_NAV_HEIGHT } from "../../lib/constants";
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

/**
 * Flexible vertical gap for the anchored home column (DEV-358 direction from
 * Erik's "No Clip" comp, 5782:5544). Starts at its compressed floor and grows
 * with leftover screen height; the grow weights are the floor→design deltas,
 * so when the column fits its reference frame each gap lands near its design
 * value, taller screens keep expanding, and shorter screens sit at the floor —
 * where the surrounding ScrollView takes over.
 */
function FlexGap({ min, design }: { min: number; design: number }) {
  return <View style={{ flexBasis: min, flexGrow: design - min }} />;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: recipients = [], isLoading: loadingRecipients } =
    useRecipients();
  const { data: occasions = [], isLoading: loadingOccasions } = useOccasions();

  const isLoading = loadingRecipients || loadingOccasions;
  const groups = groupHomeOccasions(occasions);

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
        contentContainerStyle={styles.scrollContent}
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
              />
            </>
          )}
          <AddPeopleTile />
          {groups.nextUp.length > 0 && (
            <>
              <FlexGap
                min={Spacing.heroToSectionGapMin}
                design={Spacing.heroToSectionGap}
              />
              <NextUpCarousel occasions={groups.nextUp} />
            </>
          )}
          {groups.horizon.length > 0 && (
            <>
              <FlexGap
                min={Spacing.sectionGapMin}
                design={Spacing.sectionGap}
              />
              <OnTheHorizonGrid occasions={groups.horizon} />
            </>
          )}
          {!groups.hero && (
            <Text variant="bodyLarge" style={styles.emptyText}>
              No upcoming occasions yet.
            </Text>
          )}
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
    flexGrow: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    paddingBottom: BOTTOM_NAV_HEIGHT,
  },
  content: {
    maxWidth: 800,
    width: "100%",
    // Stretch to the viewport so the FlexGap spacers can distribute leftover
    // height (top/bottom-anchored column); vertical gaps live in the spacers,
    // not a column `gap`.
    flexGrow: 1,
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
