import { View, ScrollView, StyleSheet } from "react-native";
import { Text, IconButton, Card } from "react-native-paper";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { HEADER_HEIGHT } from "../../lib/constants";
import { Session } from "@supabase/supabase-js";

export default function SupportSettings() {
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
          <Text variant="headlineMedium" style={styles.title}>
            Support & Help
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Please sign in to access support.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Main white card container */}
        <Card style={styles.mainCard}>
          {/* Header section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text variant="headlineMedium" style={styles.title}>
                Support & Help
              </Text>
              <Text variant="bodyLarge" style={styles.subtitle}>
                Get help, contact support or report issues
              </Text>
            </View>
            <IconButton
              icon="arrow-left"
              size={20}
              iconColor="#000000"
              onPress={() => router.back()}
              style={styles.backButton}
            />
          </View>

          {/* Placeholder content */}
          <View style={styles.placeholderContainer}>
            <Text variant="titleLarge" style={styles.placeholderTitle}>
              Coming Soon
            </Text>
            <Text variant="bodyMedium" style={styles.placeholderText}>
              Support and help resources will be available here soon. You'll be
              able to contact our support team, browse FAQs, and report issues
              directly from this page.
            </Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
    paddingTop: HEADER_HEIGHT, // Account for header height
  },
  mainCard: {
    backgroundColor: "transparent",
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
    marginBottom: 8,
  },
  subtitle: {
    color: "#666",
  },
  backButton: {
    margin: 0,
  },
  placeholderContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  placeholderTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  placeholderText: {
    textAlign: "center",
    color: "#666",
    lineHeight: 24,
    maxWidth: 500,
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
  },
});
