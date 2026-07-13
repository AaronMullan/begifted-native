import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import { Spacing } from "../../../lib/spacing";
import { openLink } from "../../../lib/open-link";
import {
  TERMS_OF_SERVICE_URL,
  PRIVACY_POLICY_URL,
  APPLE_STANDARD_EULA_URL,
} from "../../../lib/legal";
import type { Session } from "@supabase/supabase-js";

type LegalRowProps = {
  label: string;
  url: string;
};

const LegalRow: React.FC<LegalRowProps> = ({ label, url }) => (
  <Pressable
    onPress={() => void openLink(url)}
    accessibilityRole="link"
    accessibilityLabel={label}
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
  >
    <Text style={styles.rowLabel}>{label}</Text>
    <MaterialIcons name="open-in-new" size={16} color={Colors.brand.darkTeal} />
  </Pressable>
);

const Divider: React.FC = () => <View style={styles.divider} />;

export default function LegalSettings() {
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

  if (loading || !session) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

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
            <Text style={styles.title}>Legal & Privacy</Text>
          </View>

          <View style={styles.list}>
            <Divider />
            <LegalRow label="Terms of Service" url={TERMS_OF_SERVICE_URL} />
            <LegalRow label="Privacy Policy" url={PRIVACY_POLICY_URL} />
            <LegalRow
              label="App License (EULA)"
              url={APPLE_STANDARD_EULA_URL}
            />
            <Divider />
          </View>

          <Text style={styles.note}>
            Documents open in your browser. The App License is Apple&apos;s
            standard End User License Agreement.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// No Figma frame yet (DES-2); follows the Settings index row pattern and the
// Billing subpage header pattern so it inherits a design pass for free.
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
  list: {
    marginTop: 8,
  },
  row: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowLabel: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.white,
  },
  note: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
    marginTop: 23,
  },
  loadingText: {
    ...Typography.subhead,
    textAlign: "center",
    color: Colors.darks.black,
    opacity: 0.9,
  },
});
