import { View, StyleSheet, ScrollView } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import MenuCard from "../../components/MenuCard";
import { BOTTOM_NAV_HEIGHT } from "../../lib/constants";
import { useBottomNavScrollVisibility } from "../../hooks/use-bottom-nav-scroll-visibility";
import { useAuth } from "../../hooks/use-auth";
import { useRecipients } from "../../hooks/use-recipients";
import { useOccasions } from "../../hooks/use-occasions";
import { useProfile } from "../../hooks/use-profile";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: recipients = [], isLoading: loadingRecipients } =
    useRecipients();
  const { data: occasions = [], isLoading: loadingOccasions } = useOccasions();
  const { data: profile } = useProfile();
  const { handleScroll } = useBottomNavScrollVisibility();

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "User";
  const isLoading = loadingRecipients || loadingOccasions;

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000000" />
            <Text variant="bodyMedium" style={styles.loadingText}>
              Loading...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Dashboard
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Please sign in to view your dashboard.
          </Text>
        </View>
      </View>
    );
  }

  // Show loading only when we have no data yet (avoids spinner when we have cached data from Contacts/Calendar)
  if (isLoading && recipients.length === 0 && occasions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.greeting}>
              Hello, {displayName}!
            </Text>
            <Text variant="titleLarge" style={styles.tagline}>
              Let&apos;s make someone&apos;s day special
            </Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000000" />
            <Text variant="bodyMedium" style={styles.loadingText}>
              Loading dashboard...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Header section */}
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.greeting}>
              Hello, {displayName}!
            </Text>
            <Text variant="titleLarge" style={styles.tagline}>
              Let&apos;s make someone&apos;s day special
            </Text>
          </View>

          {/* Three cards */}
          <View style={styles.cardsContainer}>
            <MenuCard
              icon="people-outline"
              title="Recipients"
              description="View, edit, or add the people you gift"
              onPress={() => router.push("/contacts")}
            />
            <MenuCard
              icon="event"
              title="Upcoming"
              description="See your upcoming occasions and reminders"
              onPress={() => router.push("/calendar")}
            />
            <MenuCard
              icon="settings"
              title="Settings"
              description="Manage your account and preferences"
              onPress={() => router.push("/settings" as any)}
            />
          </View>
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
    padding: 20,
    backgroundColor: "transparent",
    alignSelf: "stretch",
  },
  header: {
    marginBottom: 48,
  },
  greeting: {
    marginBottom: 8,
    color: Colors.darks.black,
  },
  tagline: {
    color: Colors.darks.black,
    fontWeight: "600",
  },
  cardsContainer: {
    gap: 24,
  },
  title: {
    marginBottom: 8,
    color: Colors.darks.black,
  },
  subtitle: {
    color: Colors.darks.black,
    opacity: 0.9,
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
});
