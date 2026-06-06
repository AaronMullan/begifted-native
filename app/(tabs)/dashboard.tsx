import { View, StyleSheet, ScrollView } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { BOTTOM_NAV_HEIGHT } from "../../lib/constants";
import { useBottomNavScrollVisibility } from "../../hooks/use-bottom-nav-scroll-visibility";
import { useAuth } from "../../hooks/use-auth";
import { useRecipients } from "../../hooks/use-recipients";
import { useOccasions } from "../../hooks/use-occasions";
import { groupHomeOccasions } from "../../utils/home-occasions";
import HomeHeroCard from "../../components/home/HomeHeroCard";
import NextUpCarousel from "../../components/home/NextUpCarousel";
import OnTheHorizonGrid from "../../components/home/OnTheHorizonGrid";
import AddPeopleTile from "../../components/home/AddPeopleTile";
import GradientBackground from "../../components/GradientBackground";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: recipients = [], isLoading: loadingRecipients } =
    useRecipients();
  const { data: occasions = [], isLoading: loadingOccasions } = useOccasions();
  const { handleScroll } = useBottomNavScrollVisibility();

  const isLoading = loadingRecipients || loadingOccasions;
  const groups = groupHomeOccasions(occasions);

  if (authLoading) {
    return (
      <View style={styles.container}>
        <GradientBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.darks.black} />
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
          <ActivityIndicator size="large" color={Colors.darks.black} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading dashboard...
          </Text>
        </View>
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
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          <View style={styles.heroBlock}>
            {groups.hero && <HomeHeroCard occasion={groups.hero} />}
            <AddPeopleTile />
          </View>
          <NextUpCarousel occasions={groups.nextUp} />
          <OnTheHorizonGrid occasions={groups.horizon} />
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: "transparent",
    alignSelf: "stretch",
    gap: 32,
  },
  heroBlock: {
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
  },
  signInTitle: {
    marginBottom: 8,
    color: Colors.darks.black,
  },
  emptyText: {
    color: Colors.darks.black,
    opacity: 0.7,
    textAlign: "center",
    paddingVertical: 40,
  },
});
