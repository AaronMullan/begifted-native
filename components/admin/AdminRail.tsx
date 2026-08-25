import { AdminTheme } from "@/lib/admin-theme";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";
import { Typography } from "@/lib/typography";

const NAV_LINKS = [
  { path: "/admin/dashboard", label: "Traction", icon: "show-chart" },
  { path: "/admin/playground", label: "Playground", icon: "science" },
  { path: "/admin/prompts", label: "Version History", icon: "history" },
  { path: "/admin/searches", label: "Searches", icon: "search" },
  { path: "/admin/clicks", label: "Engagement", icon: "ads-click" },
  {
    path: "/admin/beta-feedback",
    label: "Beta Check-ins",
    icon: "rate-review",
  },
  { path: "/admin/feedback", label: "Feedback", icon: "forum" },
  { path: "/admin/ai-model", label: "AI Model", icon: "smart-toy" },
  {
    path: "/admin/kill-switch",
    label: "Kill Switch",
    icon: "power-settings-new",
  },
] as const;

const BrandMark: React.FC = () => (
  <View style={styles.brand}>
    <View style={styles.mark}>
      <Text style={styles.markText}>BG</Text>
    </View>
    <View>
      <Text style={styles.brandName}>BeGifted</Text>
      <Text style={styles.brandSub}>Admin console</Text>
    </View>
  </View>
);

/** Wide-screen vertical rail. Persists across route changes (mounted in the
 * admin layout, not per-screen). */
export const AdminRail: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.rail}>
      <BrandMark />
      <View style={styles.railNav}>
        {NAV_LINKS.map((link) => {
          const active = link.path === pathname;
          return (
            <Pressable
              key={link.path}
              onPress={() => !active && router.push(link.path)}
              accessibilityRole="link"
              accessibilityLabel={link.label}
              accessibilityState={{ selected: active }}
              style={[styles.railItem, active && styles.railItemActive]}
            >
              <MaterialIcons
                name={link.icon}
                size={18}
                color={active ? AdminTheme.textStrong : AdminTheme.muted}
              />
              <Text
                style={[styles.railLabel, active && styles.railLabelActive]}
              >
                {link.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

/** Narrow-screen horizontal nav — a scrollable pill row across the top. */
export const AdminTopNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.topNavWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topNav}
      >
        {NAV_LINKS.map((link) => {
          const active = link.path === pathname;
          return (
            <Pressable
              key={link.path}
              onPress={() => !active && router.push(link.path)}
              accessibilityRole="link"
              accessibilityLabel={link.label}
              accessibilityState={{ selected: active }}
              style={[styles.topItem, active && styles.railItemActive]}
            >
              <MaterialIcons
                name={link.icon}
                size={16}
                color={active ? AdminTheme.textStrong : AdminTheme.muted}
              />
              <Text
                style={[styles.railLabel, active && styles.railLabelActive]}
              >
                {link.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rail: {
    width: 236,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 18,
    borderRightWidth: 1,
    borderRightColor: AdminTheme.border,
    backgroundColor: AdminTheme.railBg,
    height: "100%",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 22,
  },
  mark: {
    width: 30,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#AD4B5F",
    alignItems: "center",
    justifyContent: "center",
  },
  markText: {
    ...Typography.eyebrow,
    color: "#fff",
    fontWeight: "800",
  },
  brandName: {
    ...Typography.subhead,
    color: AdminTheme.textStrong,
    fontWeight: "700",
  },
  brandSub: {
    ...Typography.caption,
    color: AdminTheme.faint,
  },
  railNav: {
    gap: 2,
  },
  railItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 9,
  },
  railItemActive: {
    backgroundColor: AdminTheme.navActive,
  },
  railLabel: {
    ...Typography.tagLabel,
    color: AdminTheme.muted,
  },
  railLabelActive: {
    color: AdminTheme.textStrong,
  },
  topNavWrap: {
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.border,
    backgroundColor: AdminTheme.railBg,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
});

export default AdminRail;
