import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Button, Card, ActivityIndicator } from "react-native-paper";
import { useState, useEffect, useRef } from "react";
import { Link, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Cache utility functions
const CACHE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes

const getStorage = () => {
  if (Platform.OS === "web") {
    return {
      getItem: (key: string) => {
        if (typeof window !== "undefined") {
          return Promise.resolve(window.localStorage.getItem(key));
        }
        return Promise.resolve(null);
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, value);
        }
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(key);
        }
        return Promise.resolve();
      },
    };
  }
  return AsyncStorage;
};

type CachedDashboardData = {
  recipientsCount: number;
  upcomingCount: number;
  username: string;
  timestamp: number;
};

async function getCachedDashboardData(
  userId: string
): Promise<CachedDashboardData | null> {
  try {
    const storage = getStorage();
    const cacheKey = `dashboard:${userId}`;
    const cached = await storage.getItem(cacheKey);
    if (!cached) return null;

    const data: CachedDashboardData = JSON.parse(cached);
    const now = Date.now();
    const isExpired = now - data.timestamp > CACHE_EXPIRATION_MS;

    if (isExpired) {
      // Cache expired, remove it
      await storage.removeItem(cacheKey);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error reading dashboard cache:", error);
    return null;
  }
}

async function setCachedDashboardData(
  userId: string,
  data: Omit<CachedDashboardData, "timestamp">
): Promise<void> {
  try {
    const storage = getStorage();
    const cacheKey = `dashboard:${userId}`;
    const cacheData: CachedDashboardData = {
      ...data,
      timestamp: Date.now(),
    };
    await storage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error saving dashboard cache:", error);
  }
}

async function clearDashboardCache(userId: string): Promise<void> {
  try {
    const storage = getStorage();
    const cacheKey = `dashboard:${userId}`;
    await storage.removeItem(cacheKey);
  } catch (error) {
    console.error("Error clearing dashboard cache:", error);
  }
}

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string>("");
  const [recipientsCount, setRecipientsCount] = useState<number | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const router = useRouter();
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        currentUserIdRef.current = session.user.id;
        loadDashboardData(session.user.id, session.user.email);
      } else {
        setLoading(false);
        setLoadingRecipients(false);
        setLoadingUpcoming(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        currentUserIdRef.current = session.user.id;
        loadDashboardData(session.user.id, session.user.email);
      } else {
        // Clear cache on sign out using stored userId
        if (currentUserIdRef.current) {
          clearDashboardCache(currentUserIdRef.current);
          currentUserIdRef.current = null;
        }
        setRecipientsCount(null);
        setUpcomingCount(null);
        setUsername("");
        setLoading(false);
        setLoadingRecipients(false);
        setLoadingUpcoming(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadDashboardData(userId: string, userEmail?: string) {
    // First, try to load from cache
    const cached = await getCachedDashboardData(userId);
    if (cached) {
      // Show cached data immediately
      setUsername(cached.username);
      setRecipientsCount(cached.recipientsCount);
      setUpcomingCount(cached.upcomingCount);
      setLoading(false);
      setLoadingRecipients(false);
      setLoadingUpcoming(false);
    } else {
      // No cache, show loading states
      setLoading(true);
      setLoadingRecipients(true);
      setLoadingUpcoming(true);
    }

    // Always fetch fresh data in background
    fetchUserData(userId, userEmail, !!cached);
  }

  async function fetchUserData(
    userId: string,
    userEmail?: string,
    hasCache = false
  ) {
    try {
      if (!hasCache) {
        setLoading(true);
      }

      // Fetch username from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError);
      }

      let fetchedUsername = "";
      if (profileData?.username) {
        fetchedUsername = profileData.username;
        setUsername(fetchedUsername);
      } else if (userEmail) {
        // Fallback to email if no username
        fetchedUsername = userEmail.split("@")[0];
        setUsername(fetchedUsername);
      }

      // Fetch recipients count
      if (!hasCache) {
        setLoadingRecipients(true);
      }

      const { count: recipientsCount, error: recipientsError } = await supabase
        .from("recipients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (recipientsError) {
        console.error("Error fetching recipients count:", recipientsError);
        if (!hasCache) {
          setRecipientsCount(0);
        }
      } else {
        setRecipientsCount(recipientsCount || 0);
      }
      setLoadingRecipients(false);

      // Fetch upcoming occasions count (next 90 days)
      if (!hasCache) {
        setLoadingUpcoming(true);
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 90);

      const dateFrom = today.toISOString().split("T")[0];
      const dateTo = futureDate.toISOString().split("T")[0];

      const { count: occasionsCount, error: occasionsError } = await supabase
        .from("occasions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("date", dateFrom)
        .lte("date", dateTo);

      if (occasionsError) {
        console.error("Error fetching occasions count:", occasionsError);
        // Always set a value, even if there's an error
        setUpcomingCount(0);
      } else {
        setUpcomingCount(occasionsCount || 0);
      }
      setLoadingUpcoming(false);

      // Save to cache
      await setCachedDashboardData(userId, {
        recipientsCount: recipientsCount || 0,
        upcomingCount: occasionsCount || 0,
        username: fetchedUsername,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      if (!hasCache) {
        setRecipientsCount(0);
        setUpcomingCount(0);
      }
    } finally {
      setLoading(false);
      setLoadingRecipients(false);
      setLoadingUpcoming(false);
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
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={[styles.iconContainer, styles.recipientsIcon]}>
                  <MaterialIcons name="people" size={32} color="#000000" />
                </View>
                {loadingRecipients && recipientsCount === null ? (
                  <ActivityIndicator size="small" style={styles.loader} />
                ) : (
                  <Text variant="displaySmall" style={styles.cardNumber}>
                    {recipientsCount ?? 0}
                  </Text>
                )}
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
                  <MaterialIcons
                    name="calendar-today"
                    size={32}
                    color="#000000"
                  />
                </View>
                {loadingUpcoming && upcomingCount === null ? (
                  <ActivityIndicator size="small" style={styles.loader} />
                ) : (
                  <Text variant="displaySmall" style={styles.cardNumber}>
                    {upcomingCount ?? 0}
                  </Text>
                )}
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
                <MaterialIcons name="settings" size={32} color="#000000" />
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
    marginBottom: 32,
  },
  greeting: {
    marginBottom: 8,
  },
  tagline: {
    color: "#666",
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
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
  loader: {
    marginBottom: 8,
  },
});
