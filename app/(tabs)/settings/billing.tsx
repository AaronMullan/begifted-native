import { View, ScrollView, StyleSheet } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import { Spacing } from "../../../lib/spacing";
import type { Session } from "@supabase/supabase-js";

export default function BillingSettings() {
  const insets = useSafeAreaInsets();
  const headerSpacerHeight = Math.max(HEADER_HEIGHT, insets.top + 60);
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
        <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
        <View style={styles.content}>
          <Text style={styles.title}>Billing & Subscription</Text>
          <Text style={styles.note}>
            Please sign in to manage your billing.
          </Text>
        </View>
      </View>
    );
  }

  // v4 frame: a non-functional "Coming Soon" billboard. Billing management
  // happens outside the app (web only, App Store revenue-share constraints);
  // real subscription management is DEV-262.
  return (
    <View style={styles.container}>
      <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <IconButton
              icon="chevron-left"
              size={20}
              iconColor={Colors.brand.darkTeal}
              onPress={() => router.back()}
              style={styles.backButton}
            />
            <Text style={styles.title}>Billing & Subscription</Text>
          </View>

          <View style={styles.billboard}>
            <Text style={styles.comingSoon}>COMING SOON</Text>
            <Text style={styles.planName}>BeGifted Plus</Text>
            <Text style={styles.pricing}>
              $9/mo or $99/yr — pricing may change before launch
            </Text>
          </View>

          <Text style={styles.note}>
            We&apos;ll let you know as soon as subscriptions are ready. No
            action needed from you right now.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Spec: Figma frame 4518:3994 ("Billing & Subscription v4") — darkTeal
// billboard card (338 wide at x=32, radius 12, 18/16 padding) with gold
// COMING SOON eyebrow, white plan name, lightTeal pricing line; mediumTeal
// note below.
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
    paddingHorizontal: Spacing.sectionHeadInset,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
    // IconButton pads its 44pt tap target; pull it back so the chevron sits
    // on the gutter line.
    marginLeft: -12,
  },
  backButton: {
    margin: 0,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  billboard: {
    backgroundColor: Colors.brand.darkTeal,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
  },
  comingSoon: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.gold,
  },
  planName: {
    ...Typography.planName,
    color: Colors.white,
  },
  pricing: {
    ...Typography.copyblock,
    color: Colors.brand.lightTeal,
  },
  // The frame's 13pt is off the published scale; copyblock (14) is the
  // nearest token.
  note: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
    marginTop: 23,
  },
  loadingText: {
    ...Typography.subhead,
    textAlign: "center",
    color: Colors.black,
    opacity: 0.9,
  },
});
