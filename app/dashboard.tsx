import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useState, useEffect } from "react";
import { Link, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons";
import { SecondaryButton } from "../components/ui/buttons";
import { colors, spacing, shadows, borderRadius } from "../constants/theme";

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
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
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
        {/* Main white card container */}
        <View style={styles.mainCard}>
          {/* Header section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hello, {displayName}!</Text>
              <Text style={styles.tagline}>
                Let's make someone's day special
              </Text>
            </View>
            <SecondaryButton
              title="Sign Out"
              onPress={handleSignOut}
              style={styles.signOutButton}
            />
          </View>

          {/* Three cards */}
          <View style={styles.cardsContainer}>
            {/* Recipients Card */}
            <Link href="/contacts" asChild>
              <TouchableOpacity style={styles.card}>
                <View style={[styles.iconContainer, styles.recipientsIcon]}>
                  <Ionicons name="people" size={32} color="#FFB6C1" />
                </View>
                <Text style={styles.cardNumber}>{recipientsCount}</Text>
                <Text style={styles.cardTitle}>Recipients</Text>
                <Text style={styles.cardDescription}>
                  Tap to view, edit, or add recipients
                </Text>
              </TouchableOpacity>
            </Link>

            {/* Upcoming Card */}
            <Link href="/calendar" asChild>
              <TouchableOpacity style={styles.card}>
                <View style={[styles.iconContainer, styles.upcomingIcon]}>
                  <Ionicons name="calendar" size={32} color="#FFA500" />
                </View>
                <Text style={styles.cardNumber}>{upcomingCount}</Text>
                <Text style={styles.cardTitle}>Upcoming</Text>
                <Text style={styles.cardDescription}>Tap to view calendar</Text>
              </TouchableOpacity>
            </Link>

            {/* Settings Card */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/settings" as any)}
            >
              <View style={[styles.iconContainer, styles.settingsIcon]}>
                <Ionicons name="settings" size={32} color="#9370DB" />
              </View>
              <Text style={styles.settingsTitle}>Settings</Text>
              <Text style={styles.cardDescription}>
                Manage your account and preferences
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightPurple,
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: spacing.margin.xl,
  },
  mainCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.padding.xl,
    marginTop: spacing.margin.xl,
    ...shadows.medium,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.margin.xxxl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.darkText,
    marginBottom: spacing.margin.xs,
  },
  tagline: {
    fontSize: 16,
    color: colors.gray,
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  signOutText: {
    fontSize: 14,
    color: colors.darkText,
    fontWeight: "500",
  },
  cardsContainer: {
    gap: spacing.margin.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.medium,
    padding: spacing.padding.xl,
    alignItems: "center",
    ...shadows.light,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.margin.lg,
    backgroundColor: colors.lightGrayAlt,
  },
  recipientsIcon: {
    backgroundColor: "#FFF0F5",
  },
  upcomingIcon: {
    backgroundColor: "#FFF8E1",
  },
  settingsIcon: {
    backgroundColor: "#F3E5F5",
  },
  cardNumber: {
    fontSize: 48,
    fontWeight: "bold",
    color: colors.darkText,
    marginBottom: spacing.margin.xs,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.darkText,
    marginBottom: spacing.margin.xs,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.darkText,
    marginBottom: spacing.margin.xs,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.gray,
    textAlign: "center",
    marginTop: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#231F20",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
});
