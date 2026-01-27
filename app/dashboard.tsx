import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { Link, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Colors } from "../lib/colors";
import { HEADER_HEIGHT } from "../lib/constants";
import { useAuth } from "../hooks/use-auth";
import { useDashboardStats } from "../hooks/use-dashboard-stats";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

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

  const displayName = stats?.username || user.email?.split("@")[0] || "User";
  const recipientsCount = stats?.recipientsCount ?? 0;
  const upcomingCount = stats?.upcomingCount ?? 0;
  const loadingRecipients = isLoading;
  const loadingUpcoming = isLoading;

  // Show loading state if still loading initial data
  if (loading && recipientsCount === null && upcomingCount === null) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.greeting}>
              Hello, {displayName}!
            </Text>
            <Text variant="bodyLarge" style={styles.tagline}>
              Let's make someone's day special
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
      >
        <View style={styles.content}>
        {/* Header section */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.greeting}>
            Hello, {displayName}!
          </Text>
          <Text variant="bodyLarge" style={styles.tagline}>
            Let's make someone's day special
          </Text>
        </View>

        {/* Three cards */}
        <View style={styles.cardsContainer}>
          {/* Recipients Card */}
          <Link href="/contacts" asChild>
            <View style={styles.card}>
              <BlurView intensity={20} style={styles.blurBackground} />
              <View style={styles.cardContent}>
                <View style={[styles.iconContainer, styles.recipientsIcon]}>
                  <MaterialIcons name="people" size={32} color={Colors.pinks.dark} />
                </View>
                {loadingRecipients ? (
                  <ActivityIndicator size="small" style={styles.loader} />
                ) : (
                  <Text variant="displaySmall" style={styles.cardNumber}>
                    {recipientsCount}
                  </Text>
                )}
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Recipients
                </Text>
                <Text variant="bodyMedium" style={styles.cardDescription}>
                  Tap to view, edit, or add recipients
                </Text>
              </View>
            </View>
          </Link>

          {/* Upcoming Card */}
          <Link href="/calendar" asChild>
            <View style={styles.card}>
              <BlurView intensity={20} style={styles.blurBackground} />
              <View style={styles.cardContent}>
                <View style={[styles.iconContainer, styles.upcomingIcon]}>
                  <MaterialIcons
                    name="calendar-today"
                    size={32}
                    color={Colors.pinks.medium}
                  />
                </View>
                {loadingUpcoming ? (
                  <ActivityIndicator size="small" style={styles.loader} />
                ) : (
                  <Text variant="displaySmall" style={styles.cardNumber}>
                    {upcomingCount}
                  </Text>
                )}
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Upcoming
                </Text>
                <Text variant="bodyMedium" style={styles.cardDescription}>
                  Tap to view calendar
                </Text>
              </View>
            </View>
          </Link>

          {/* Settings Card */}
          <Pressable
            style={styles.card}
            onPress={() => router.push("/settings" as any)}
          >
            <BlurView intensity={20} style={styles.blurBackground} />
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.settingsIcon]}>
                <MaterialIcons name="settings" size={32} color={Colors.pinks.dark} />
              </View>
              <Text variant="titleLarge" style={styles.settingsTitle}>
                Settings
              </Text>
              <Text variant="bodyMedium" style={styles.cardDescription}>
                Manage your account and preferences
              </Text>
            </View>
          </Pressable>
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
  },
  content: {
    maxWidth: 800,
    width: "100%",
    padding: 20,
    paddingTop: HEADER_HEIGHT, // Account for header height
    backgroundColor: "transparent",
    alignSelf: "stretch",
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    marginBottom: 8,
    color: Colors.darks.black,
  },
  tagline: {
    color: Colors.darks.black,
    opacity: 0.9,
  },
  cardsContainer: {
    gap: 40,
  },
  card: {
    marginBottom: 0,
    backgroundColor: Colors.neutrals.light + "30", // Low opacity (~19%)
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    overflow: "visible",
    position: "relative",
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  cardContent: {
    alignItems: "center",
    padding: 20,
    paddingTop: 40, // Extra padding to account for icon
    position: "relative",
    zIndex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.white,
    position: "absolute",
    top: -32, // Half out (icon is 64px, so -32px puts it exactly half in/half out)
    left: 20,
    zIndex: 2,
  },
  recipientsIcon: {
    backgroundColor: Colors.white,
  },
  upcomingIcon: {
    backgroundColor: Colors.white,
  },
  settingsIcon: {
    backgroundColor: Colors.white,
  },
  cardNumber: {
    marginBottom: 8,
    marginTop: 16,
    color: Colors.darks.black,
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: 8,
    color: Colors.darks.black,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingsTitle: {
    marginBottom: 8,
    color: Colors.darks.black,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardDescription: {
    textAlign: "center",
    marginTop: 4,
    color: Colors.darks.black,
    opacity: 0.8,
  },
  title: {
    marginBottom: 8,
    color: Colors.darks.black,
  },
  subtitle: {
    color: Colors.darks.black,
    opacity: 0.9,
  },
  loader: {
    marginBottom: 8,
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
