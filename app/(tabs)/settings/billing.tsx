import { View, ScrollView, StyleSheet } from "react-native";
import { Text, IconButton, Button } from "react-native-paper";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import { Session } from "@supabase/supabase-js";
import { showSnackbar } from "../../../components/GlobalSnackbar";

// Display copy only — plan state and the switch-plan action are placeholders
// until real subscription wiring lands (DEV-262). Values below are the
// finalized-frame sample content, not a live subscription.
const CURRENT_PLAN_NAME = "BeGifted Plus";
const CURRENT_PLAN_RENEWAL = "Renews Aug 12, 2026 · $9/mo";

export default function BillingSettings() {
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
          <Text style={styles.title}>Billing & Subscription</Text>
          <Text style={styles.subtitle}>
            Please sign in to manage your billing.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerSpacer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.mainCard}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Billing & Subscription</Text>
                <Text style={styles.subtitle}>
                  Manage your subscription plan and payment methods
                </Text>
              </View>
              <IconButton
                icon="arrow-left"
                size={20}
                iconColor={Colors.black}
                onPress={() => router.back()}
                style={styles.backButton}
              />
            </View>

            {/* Current plan */}
            <View style={styles.planCard}>
              <Text style={styles.planLabel}>Current Plan</Text>
              <Text style={styles.planName}>{CURRENT_PLAN_NAME}</Text>
              <Text style={styles.planRenewal}>{CURRENT_PLAN_RENEWAL}</Text>
            </View>

            {/* Pricing */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pricing</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Monthly</Text>
                <Text style={styles.priceValue}>$9/month</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Yearly</Text>
                <Text style={styles.priceValue}>$99/year</Text>
              </View>
            </View>

            <Button
              mode="contained"
              buttonColor={Colors.black}
              textColor={Colors.white}
              onPress={() => showSnackbar("Plan management is coming soon.")}
              style={styles.switchButton}
              labelStyle={styles.switchButtonText}
            >
              Switch plan – 99/y
            </Button>
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
  headerSpacer: {
    height: HEADER_HEIGHT,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: BOTTOM_NAV_HEIGHT + 40,
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  mainCard: {
    backgroundColor: "transparent",
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
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
    ...Typography.h1,
    color: Colors.black,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.subhead,
    color: Colors.darks.black,
    opacity: 0.9,
  },
  // 44pt min tap target (HIG); transparent container, 20pt icon unchanged.
  backButton: {
    margin: 0,
    width: 44,
    height: 44,
  },
  planCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.white,
    backgroundColor: Colors.neutrals.light + "30",
    padding: 20,
    marginBottom: 32,
  },
  planLabel: {
    ...Typography.smallCta,
    color: Colors.darks.black,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  planName: {
    ...Typography.h2,
    color: Colors.black,
    marginBottom: 6,
  },
  planRenewal: {
    ...Typography.subhead,
    color: Colors.darks.black,
    opacity: 0.9,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.black,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grays.hairline,
  },
  priceLabel: {
    ...Typography.subhead,
    color: Colors.darks.black,
    opacity: 0.9,
  },
  priceValue: {
    ...Typography.subhead,
    color: Colors.black,
  },
  switchButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  switchButtonText: {
    ...Typography.largeCta,
    paddingVertical: 6,
  },
  loadingText: {
    textAlign: "center",
    color: Colors.darks.black,
    opacity: 0.9,
    ...Typography.subhead,
  },
});
