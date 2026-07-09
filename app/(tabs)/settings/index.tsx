import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import type { Href } from "expo-router";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import { BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { openBugReport } from "../../../lib/feedback";

type SettingsRowProps = {
  label: string;
  onPress: () => void;
};

const SettingsRow: React.FC<SettingsRowProps> = ({ label, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
  >
    <Text style={styles.rowLabel}>{label}</Text>
    <MaterialIcons
      name="chevron-right"
      size={16}
      color={Colors.brand.darkTeal}
    />
  </Pressable>
);

const Divider: React.FC = () => <View style={styles.divider} />;

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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.error("Sign out failed:", error);
    }
    router.replace("/");
  };

  if (loading) {
    return (
      <View style={styles.container}>
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
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Please sign in to manage your settings.
          </Text>
        </View>
      </View>
    );
  }

  const push = (route: Href) => () => router.push(route);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>

          <View style={styles.list}>
            <Divider />
            <SettingsRow
              label="Account Info"
              onPress={push("/settings/profile")}
            />
            <SettingsRow
              label="Gifting Style"
              onPress={push("/settings/gifting")}
            />
            <SettingsRow
              label="Notifications"
              onPress={push("/settings/notifications")}
            />
            <Divider />
            <SettingsRow
              label="Billing & Subscription"
              onPress={push("/settings/billing")}
            />
            <Divider />
            <SettingsRow label="FAQ" onPress={push("/faq")} />
            <SettingsRow
              label="Contact Us"
              onPress={push("/settings/support")}
            />
            {/* Not in the Settings frame; kept until design confirms whether
                bug reporting is dropped or folds into Contact Us. */}
            <SettingsRow
              label="Report a Bug"
              onPress={() => openBugReport("settings")}
            />
            <Divider />
          </View>

          <View style={styles.signOut}>
            <SettingsRow label="Sign Out" onPress={handleSignOut} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Spec: Figma frame 4335:1880 — serif Settings title, then divider-bounded
// groups of plain text rows ("Label >") inset to x=50 on the 402pt frame,
// with Sign Out as a bare row pinned near the bottom nav.
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
    paddingBottom: BOTTOM_NAV_HEIGHT,
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    paddingTop: 20,
    paddingLeft: 50,
    paddingRight: 52,
  },
  title: {
    ...Typography.h1,
    color: Colors.brand.darkTeal,
    marginTop: 105,
  },
  subtitle: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
    marginTop: 12,
  },
  list: {
    marginTop: 39,
  },
  row: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
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
  signOut: {
    marginTop: "auto",
    paddingTop: 40,
  },
  loadingText: {
    textAlign: "center",
    color: Colors.darks.black,
    opacity: 0.7,
  },
});
