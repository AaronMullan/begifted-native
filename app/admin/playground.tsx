import { ContextPanel } from "@/components/admin/playground/ContextPanel";
import { DeployDialog } from "@/components/admin/playground/DeployDialog";
import { PlaygroundHeader } from "@/components/admin/playground/PlaygroundHeader";
import { PromptPanel } from "@/components/admin/playground/PromptPanel";
import { ResultsDesktop } from "@/components/admin/playground/ResultsDesktop";
import { ResultsPanel } from "@/components/admin/playground/ResultsPanel";
import { useAuth } from "@/hooks/use-auth";
import { usePromptPlayground } from "@/hooks/use-prompt-playground";
import { AdminTheme } from "@/lib/admin-theme";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

const DESKTOP_BREAKPOINT = 900;

// Admin gating (loading / Access Denied) lives in app/admin/_layout.tsx; the
// layout only renders this screen for a signed-in admin.
const PlaygroundScreen: React.FC = () => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  if (!user) return null;

  return <PlaygroundContent userId={user.id} isDesktop={isDesktop} />;
};

type PlaygroundContentProps = {
  userId: string;
  isDesktop: boolean;
};

// Thin container: shared state lives in usePromptPlayground; each child owns
// its own UI-only state (menus, drafts, collapsed sections).
const PlaygroundContent: React.FC<PlaygroundContentProps> = ({
  userId,
  isDesktop,
}) => {
  const playground = usePromptPlayground(userId);
  const [showDeployDialog, setShowDeployDialog] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.maxWidth}>
          <PlaygroundHeader
            playground={playground}
            onDeployPress={() => setShowDeployDialog(true)}
          />
          {isDesktop ? (
            <View style={styles.desktopColumn}>
              <View style={styles.desktopTopRow}>
                <ContextPanel playground={playground} isDesktop />
                <PromptPanel playground={playground} isDesktop />
              </View>
              <ResultsDesktop playground={playground} />
            </View>
          ) : (
            <>
              <ContextPanel playground={playground} isDesktop={false} />
              <PromptPanel playground={playground} isDesktop={false} />
              <ResultsPanel playground={playground} />
            </>
          )}
        </View>
      </ScrollView>

      <DeployDialog
        playground={playground}
        visible={showDeployDialog}
        onDismiss={() => setShowDeployDialog(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminTheme.screenBg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  maxWidth: {
    maxWidth: 1400,
    width: "100%",
    alignSelf: "center",
  },
  desktopColumn: {
    flexDirection: "column",
    gap: 16,
  },
  desktopTopRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
});

export default PlaygroundScreen;
