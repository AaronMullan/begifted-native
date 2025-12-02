import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons";
import { IconButton } from "../components/ui/IconButton";

export default function Settings() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        router.replace("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Please sign in to manage your settings.
          </Text>
        </View>
      </View>
    );
  }

  const settingsCards = [
    {
      id: "profile",
      title: "Profile Settings",
      description: "Manage your personal information and account details",
      icon: "person-outline",
      iconColor: "#FFB6C1",
      route: "/settings/profile" as any,
    },
    {
      id: "gifting",
      title: "Gifting Preferences",
      description: "Customize how AI generates gift recommendations",
      icon: "gift-outline",
      iconColor: "#FFB6C1",
      route: "/settings/gifting" as any,
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Control email and push notification settings",
      icon: "notifications-outline",
      iconColor: "#FFA500",
      route: "/settings/notifications" as any,
    },
    {
      id: "billing",
      title: "Billing & Subscription",
      description: "Manage your subscription plan and payment methods",
      icon: "card-outline",
      iconColor: "#9370DB",
      route: "/settings/billing" as any,
    },
    {
      id: "support",
      title: "Support & Help",
      description: "Get help, contact support or report issues",
      icon: "help-circle-outline",
      iconColor: "#9370DB",
      route: "/settings/support" as any,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Main white card container */}
        <View style={styles.mainCard}>
          {/* Header section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Settings</Text>
              <Text style={styles.subtitle}>
                Manage your account and preferences
              </Text>
            </View>
            <IconButton
              icon={<Ionicons name="arrow-back" size={20} color="#231F20" />}
              onPress={() => router.back()}
              style={styles.backButton}
            />
          </View>

          {/* Settings cards */}
          <View style={styles.cardsContainer}>
            {settingsCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.settingsCard}
                onPress={() => router.push(card.route)}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${card.iconColor}20` },
                  ]}
                >
                  <Ionicons
                    name={card.icon as any}
                    size={28}
                    color={card.iconColor}
                  />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDescription}>{card.description}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#999"
                  style={styles.chevron}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6E6FA", // Light purple background
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  mainCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#231F20",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cardsContainer: {
    gap: 16,
  },
  settingsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  chevron: {
    marginLeft: 12,
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
  },
});
