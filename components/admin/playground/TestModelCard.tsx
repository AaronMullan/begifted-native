import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import type { PromptPlayground } from "@/hooks/use-prompt-playground";
import type { Provider } from "@/lib/ai-models";
import { PROVIDER_MODELS } from "@/lib/ai-models";
import { AdminTheme } from "@/lib/admin-theme";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Menu,
  SegmentedButtons,
  Text,
} from "react-native-paper";

type TestModelCardProps = {
  playground: PromptPlayground;
};

export const TestModelCard: React.FC<TestModelCardProps> = ({ playground }) => {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const isModelDifferentFromProd =
    playground.playgroundProvider !== playground.productionProvider ||
    playground.playgroundModel !== playground.productionModel;

  return (
    <Card mode="contained" style={playgroundStyles.card}>
      <Card.Content>
        <View style={playgroundStyles.cardTitleRow}>
          <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
            Test Model
          </Text>
          {isModelDifferentFromProd && (
            <Chip compact style={styles.diffFromProdBadge}>
              ≠ production
            </Chip>
          )}
        </View>
        <SegmentedButtons
          value={playground.playgroundProvider}
          onValueChange={(v) => {
            const p = v as Provider;
            playground.setPlaygroundProvider(p);
            playground.setPlaygroundModel(PROVIDER_MODELS[p][0]);
          }}
          buttons={[
            { value: "openai", label: "OpenAI", showSelectedCheck: false },
            { value: "anthropic", label: "Claude", showSelectedCheck: false },
            { value: "google", label: "Google", showSelectedCheck: false },
          ]}
          style={styles.segmentedButtons}
          density="small"
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setMenuVisible(true)}
              compact
              icon="chevron-down"
              style={styles.modelButton}
            >
              {playground.playgroundModel}
            </Button>
          }
        >
          {PROVIDER_MODELS[playground.playgroundProvider].map((m) => (
            <Menu.Item
              key={m}
              onPress={() => {
                playground.setPlaygroundModel(m);
                setMenuVisible(false);
              }}
              title={m}
            />
          ))}
        </Menu>
        {playground.productionProvider && playground.productionModel && (
          <Text variant="bodySmall" style={styles.hint}>
            {"Production: "}
            <Text variant="bodySmall" style={styles.prod}>
              {`${playground.productionProvider}/${playground.productionModel}`}
            </Text>
          </Text>
        )}
        <Text variant="bodySmall" style={styles.hint}>
          {playground.productionModelSource === "app_config" ? (
            <>
              {"To update the production model, go to "}
              <Text
                variant="bodySmall"
                style={styles.hintLink}
                onPress={() => router.push("/admin/ai-model")}
              >
                Admin → AI Model
              </Text>
              .
            </>
          ) : (
            "This prompt uses a hardcoded model — change taskModel in lib/prompt-registry.ts."
          )}
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  diffFromProdBadge: {
    backgroundColor: "rgba(171,138,62,0.28)",
  },
  hint: {
    color: AdminTheme.muted,
    marginTop: 8,
  },
  hintLink: {
    color: AdminTheme.accentBright,
    textDecorationLine: "underline",
  },
  prod: {
    color: AdminTheme.text,
    fontWeight: "600",
  },
  segmentedButtons: {
    marginVertical: 8,
  },
  modelButton: {
    alignSelf: "flex-start",
    borderRadius: 8,
  },
});
