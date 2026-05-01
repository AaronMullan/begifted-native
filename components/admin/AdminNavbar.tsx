import { useAppConfig } from "@/hooks/use-app-config";
import { Colors } from "@/lib/colors";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Chip, Text } from "react-native-paper";

type AdminNavbarProps = {
  title: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

const NAV_LINKS = [
  { path: "/admin/playground", label: "Playground", icon: "flask-outline" },
  { path: "/admin/prompts", label: "Version History", icon: "history" },
  { path: "/admin/ai-model", label: "AI Model", icon: "robot" },
  { path: "/admin/kill-switch", label: "Kill Switch", icon: "power" },
] as const;

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  title,
  actions,
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: config } = useAppConfig();

  return (
    <View style={styles.wrapper}>
      {/* Stable nav row — never changes layout */}
      <View style={styles.navRow}>
        <View style={styles.navLinks}>
          {NAV_LINKS.map((link) => {
            const isActive = link.path === pathname;
            return (
              <Button
                key={link.path}
                mode={isActive ? "contained-tonal" : "text"}
                onPress={() => !isActive && router.push(link.path)}
                icon={link.icon}
                compact
                style={isActive ? styles.activeLink : undefined}
              >
                {link.label}
              </Button>
            );
          })}
        </View>
        {config && (
          <Chip
            compact
            style={styles.aiChip}
            onPress={() => router.push("/admin/ai-model")}
            icon="robot"
          >
            {`Production: ${config.ai_provider} · ${config.ai_model}`}
          </Chip>
        )}
      </View>

      {/* Page header row — title + page-specific controls */}
      <View style={styles.pageRow}>
        <Text variant="headlineSmall" style={styles.title}>
          {title}
        </Text>
        {children && <View style={styles.pageControls}>{children}</View>}
        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 12,
    gap: 10,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
  },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  activeLink: {
    borderRadius: 8,
  },
  aiChip: {
    backgroundColor: Colors.neutrals.medium,
  },
  pageRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  title: {
    fontWeight: "700",
  },
  pageControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
});
