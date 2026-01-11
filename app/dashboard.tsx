import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Text, Button, Card } from "react-native-paper";
import { useState, useEffect } from "react";
import { Link, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons";

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string>("");
  const [recipientsCount, setRecipientsCount] = useState<number>(0);
  const [upcomingCount, setUpcomingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id, session.user.email);
      } else {
        setRecipientsCount(0);
        setUpcomingCount(0);
        setUsername("");
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string, userEmail?: string) {
    try {
      setLoading(true);

      // Fetch username from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError);
      }

      if (profileData?.username) {
        setUsername(profileData.username);
      } else if (userEmail) {
        // Fallback to email if no username
        const emailName = userEmail.split("@")[0];
        setUsername(emailName);
      }

      // Fetch recipients count
      const { count: recipientsCount, error: recipientsError } = await supabase
        .from("recipients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (recipientsError) {
        console.error("Error fetching recipients count:", recipientsError);
      } else {
        setRecipientsCount(recipientsCount || 0);
      }

      // Fetch upcoming occasions count (next 90 days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 90);

      const { count: occasionsCount, error: occasionsError } = await supabase
        .from("occasions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("date", today.toISOString().split("T")[0])
        .lte("date", futureDate.toISOString().split("T")[0]);

      if (occasionsError) {
        console.error("Error fetching occasions count:", occasionsError);
        // If occasions table doesn't exist yet, set to 0
        setUpcomingCount(0);
      } else {
        setUpcomingCount(occasionsCount || 0);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        router.replace("/");
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    }
  }

  if (!session) {
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

  const displayName = username || session.user?.email?.split("@")[0] || "User";

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="headlineMedium" style={styles.greeting}>
              Hello, {displayName}!
            </Text>
            <Text variant="bodyLarge" style={styles.tagline}>
              Let's make someone's day special
            </Text>
          </View>
          <Button
            mode="text"
            onPress={handleSignOut}
            style={styles.signOutButton}
          >
            Sign Out
          </Button>
        </View>

        {/* Three cards */}
        <View style={styles.cardsContainer}>
          {/* Recipients Card */}
          <Link href="/contacts" asChild>
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={[styles.iconContainer, styles.recipientsIcon]}>
                  <Ionicons name="people" size={32} color="#000000" />
                </View>
                <Text variant="displaySmall" style={styles.cardNumber}>
                  {recipientsCount}
                </Text>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Recipients
                </Text>
                <Text variant="bodyMedium" style={styles.cardDescription}>
                  Tap to view, edit, or add recipients
                </Text>
              </Card.Content>
            </Card>
          </Link>

          {/* Upcoming Card */}
          <Link href="/calendar" asChild>
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={[styles.iconContainer, styles.upcomingIcon]}>
                  <Ionicons name="calendar" size={32} color="#000000" />
                </View>
                <Text variant="displaySmall" style={styles.cardNumber}>
                  {upcomingCount}
                </Text>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Upcoming
                </Text>
                <Text variant="bodyMedium" style={styles.cardDescription}>
                  Tap to view calendar
                </Text>
              </Card.Content>
            </Card>
          </Link>

          {/* Settings Card */}
          <Card
            style={styles.card}
            onPress={() => router.push("/settings" as any)}
          >
            <Card.Content style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.settingsIcon]}>
                <Ionicons name="settings" size={32} color="#000000" />
              </View>
              <Text variant="titleLarge" style={styles.settingsTitle}>
                Settings
              </Text>
              <Text variant="bodyMedium" style={styles.cardDescription}>
                Manage your account and preferences
              </Text>
            </Card.Content>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // White background
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    marginBottom: 8,
  },
  tagline: {
    color: "#666",
  },
  signOutButton: {
    margin: 0,
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    marginBottom: 0,
  },
  cardContent: {
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#f8f8f8",
  },
  recipientsIcon: {
    backgroundColor: "#F5F5F5",
  },
  upcomingIcon: {
    backgroundColor: "#F5F5F5",
  },
  settingsIcon: {
    backgroundColor: "#F5F5F5",
  },
  cardNumber: {
    marginBottom: 8,
  },
  cardTitle: {
    marginBottom: 8,
  },
  settingsTitle: {
    marginBottom: 8,
  },
  cardDescription: {
    textAlign: "center",
    marginTop: 4,
    color: "#666",
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    color: "#666",
  },
});
