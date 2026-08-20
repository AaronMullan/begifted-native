import { useAppConfig } from "@/hooks/use-app-config";
import { AdminTheme } from "@/lib/admin-theme";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip, Text } from "react-native-paper";

type AdminNavbarProps = {
  title: string;
  /** Optional one-line description under the title. */
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /**
   * Override the "Production: …" chip. Set this on pages (e.g. the Playground)
   * where the global app_config row isn't the right answer because the current
   * view uses a different per-task model.
   */
  productionOverride?: { provider: string; model: string };
};

/**
 * Per-screen page header for the admin console: title, optional subtitle,
 * page-specific controls, and the production-model chip. Section navigation
 * lives in the persistent rail (components/admin/AdminRail.tsx), not here.
 */
export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  title,
  subtitle,
  actions,
  children,
  productionOverride,
}) => {
  const router = useRouter();
  const { data: config } = useAppConfig();

  const chipProvider = productionOverride?.provider ?? config?.ai_provider;
  const chipModel = productionOverride?.model ?? config?.ai_model;

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text variant="headlineSmall" style={styles.title}>
            {title}
          </Text>
          {subtitle && (
            <Text variant="bodySmall" style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={styles.right}>
          {children && <View style={styles.pageControls}>{children}</View>}
          {actions && <View style={styles.actions}>{actions}</View>}
          {chipProvider && chipModel && (
            <Chip
              compact
              style={styles.aiChip}
              textStyle={styles.aiChipText}
              onPress={() => router.push("/admin/ai-model")}
              icon="robot"
            >
              {`${chipProvider} · ${chipModel}`}
            </Chip>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  titleBlock: {
    minWidth: 0,
    flexShrink: 1,
  },
  title: {
    color: AdminTheme.textStrong,
    fontWeight: "700",
  },
  subtitle: {
    color: AdminTheme.muted,
    marginTop: 6,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  pageControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  aiChip: {
    backgroundColor: AdminTheme.panelStrong,
    borderWidth: 1,
    borderColor: AdminTheme.border,
  },
  aiChipText: {
    color: AdminTheme.text,
  },
});
