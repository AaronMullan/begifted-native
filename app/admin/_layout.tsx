import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
  ActivityIndicator,
  Provider as PaperProvider,
  Text,
} from "react-native-paper";
import AdminBackground from "@/components/admin/AdminBackground";
import { AdminRail, AdminTopNav } from "@/components/admin/AdminRail";
import { useAuth } from "@/hooks/use-auth";
import { fetchIsAdmin } from "@/lib/api";
import { AdminTheme, adminPaperTheme } from "@/lib/admin-theme";

// Below this width the vertical rail is cramped, so nav collapses to a
// horizontal scrollable bar above the content (phone / narrow web).
const RAIL_BREAKPOINT = 900;

export default function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const { width } = useWindowDimensions();

  const adminQuery = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: () => fetchIsAdmin(user!.id),
    enabled: !!user?.id,
  });

  if (authLoading || adminQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user || !adminQuery.data) {
    return (
      <View style={styles.center}>
        <Text variant="headlineMedium" style={styles.accessDeniedTitle}>
          Access Denied
        </Text>
        <Text variant="bodyLarge" style={styles.accessDeniedBody}>
          You do not have admin access.
        </Text>
      </View>
    );
  }

  const wide = width >= RAIL_BREAKPOINT;

  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );

  return (
    <PaperProvider theme={adminPaperTheme}>
      <View style={styles.root}>
        <AdminBackground />
        {wide ? (
          <View style={styles.wideShell}>
            <AdminRail />
            <View style={styles.content}>{stack}</View>
          </View>
        ) : (
          <View style={styles.narrowShell}>
            <AdminTopNav />
            <View style={styles.content}>{stack}</View>
          </View>
        )}
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  wideShell: {
    flex: 1,
    flexDirection: "row",
  },
  narrowShell: {
    flex: 1,
    flexDirection: "column",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: AdminTheme.gradient[1],
  },
  accessDeniedTitle: {
    color: AdminTheme.textStrong,
  },
  accessDeniedBody: {
    marginTop: 8,
    color: AdminTheme.muted,
  },
});
