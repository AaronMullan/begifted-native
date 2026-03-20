import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { Colors } from "../../../lib/colors";
import MenuCard from "../../../components/MenuCard";
import { BOTTOM_NAV_HEIGHT } from "../../../lib/constants";

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
  }, [router]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSpacer} />
        <View style={styles.content}>
          <Text variant="bodyLarge" style={styles.loadingText}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSpacer} />
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Settings
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
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
      iconColor: "#000000",
      route: "/settings/profile" as any,
    },
    {
      id: "gifting",
      title: "Gifting Preferences",
      description: "Customize how AI generates gift recommendations",
      icon: "card-giftcard",
      iconColor: "#000000",
      route: "/settings/gifting" as any,
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Control email and push notification settings",
      icon: "notifications-none",
      iconColor: "#000000",
      route: "/settings/notifications" as any,
    },
    {
      id: "billing",
      title: "Billing & Subscription",
      description: "Manage your subscription plan and payment methods",
      icon: "credit-card",
      iconColor: "#000000",
      route: "/settings/billing" as any,
    },
    {
      id: "support",
      title: "Support & Help",
      description: "Get help, contact support or report issues",
      icon: "help-outline",
      iconColor: "#000000",
      route: "/settings/support" as any,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerSpacer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              Settings
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Manage your account and preferences
            </Text>
          </View>

          {/* Settings cards */}
          <View style={styles.cardsContainer}>
            {settingsCards.map((card) => (
              <MenuCard
                key={card.id}
                icon={card.icon as any}
                title={card.title}
                description={card.description}
                onPress={() => router.push(card.route)}
                showChevron
              />
            ))}
          </View>

          {/* Sign Out */}
          <Button
            mode="text"
            icon="logout"
            textColor={Colors.darks.black}
            onPress={async () => {
              await supabase.auth.signOut();
            }}
            style={styles.signOutButton}
          >
            Sign Out
          </Button>
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
  headerSpacer: {
    height: 0,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  scrollContent: {
    paddingBottom: BOTTOM_NAV_HEIGHT,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    marginBottom: 8,
    color: Colors.darks.black,
  },
  subtitle: {
    color: Colors.darks.black,
    opacity: 0.9,
  },
  cardsContainer: {
    gap: 24,
  },
  signOutButton: {
    marginTop: 32,
    alignSelf: "center",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
  },
});
