import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, Text } from "react-native-paper";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../hooks/use-auth";
import { useUserPreferences } from "../../../hooks/use-user-preferences";
import { upsertUserPreferences } from "../../../lib/api";
import { queryKeys } from "../../../lib/query-keys";
import { supabase } from "../../../lib/supabase";
import { showSnackbar } from "../../../components/GlobalSnackbar";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import { Spacing } from "../../../lib/spacing";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";

const OPENER = "What else should BeGifted know?";

const EMPTY_SUMMARY =
  "We're still getting to know you. Tap below to tell us about your " +
  "interests, tastes, and routines, and we'll build a picture of you here.";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

export default function AboutYou() {
  const insets = useSafeAreaInsets();
  const headerSpacerHeight = Math.max(HEADER_HEIGHT, insets.top + 60);
  const { user, loading: authLoading } = useAuth();
  const { data: preferences, isLoading: preferencesLoading } =
    useUserPreferences();
  const queryClient = useQueryClient();
  const router = useRouter();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: OPENER },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Every message runs the same pipeline the old Gifting Style save used:
  // append to user_description (the canonical free-text store), re-extract the
  // structured user_summary, then re-synthesize the giver profile the card
  // shows — so gift generation consumes the new input exactly as before.
  async function handleSend() {
    const text = draft.trim();
    if (!text || !user || sending) return;

    setDraft("");
    setSending(true);
    setMessages((current) => [...current, { role: "user", text }]);

    try {
      const existing = preferences?.user_description?.trim() ?? "";
      const newDescription = existing ? `${existing}\n${text}` : text;

      // Extraction is best-effort: a failed extraction still saves the raw
      // text (mirrors the old save path), so nothing the user typed is lost.
      let userSummary: unknown;
      try {
        const { data, error } = await supabase.functions.invoke(
          "extract-user-preferences",
          { body: { text: newDescription } }
        );
        if (!error) userSummary = data?.user_summary;
      } catch (extractError) {
        console.error("Error extracting preferences:", extractError);
      }

      await upsertUserPreferences(user.id, {
        user_description: newDescription,
        ...(userSummary != null && {
          user_summary: userSummary as never,
        }),
      });

      // Await the synthesis so the invalidation below picks up the fresh
      // profile for the "What We've Learned" card.
      await supabase.functions.invoke("synthesize-giver-profile", {
        body: { userId: user.id },
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.userPreferences(user.id),
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "Got it — we've updated what we know about you. What else should BeGifted know?",
        },
      ]);
    } catch (error) {
      console.error("Error saving about-you input:", error);
      showSnackbar("Couldn't save that — please try again.");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "Something went wrong saving that — please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const loading = authLoading || (!!user && preferencesLoading);
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

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
        <View style={styles.content}>
          <Text style={styles.title}>About You</Text>
          <Text style={styles.directional}>
            Please sign in to manage your preferences.
          </Text>
        </View>
      </View>
    );
  }

  const summary =
    preferences?.synthesized_giver_profile?.trim() || EMPTY_SUMMARY;

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
            <Text style={styles.title}>About You</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>
              What we&apos;ve learned so far
            </Text>
            <Text style={styles.cardSummary}>{summary}</Text>
            <View style={styles.cardSpacer} />
            <Pressable
              onPress={() => sheetRef.current?.present()}
              accessibilityRole="button"
              accessibilityLabel="Continue the conversation"
            >
              <Text style={styles.cardCta}>Continue the conversation →</Text>
            </Pressable>
          </View>

          <Text style={styles.directional}>
            Update your interests, tastes, routines, or retailers you&apos;d
            rather avoid
          </Text>
        </View>
      </ScrollView>

      {/* Contextual-task drawer per the v4 interaction model: no scrim, the
          page stays visible behind it. */}
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={["65%"]}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Tell us about you</Text>
          <BottomSheetScrollView contentContainerStyle={styles.transcript}>
            {messages.map((message, index) => (
              <View
                key={index}
                style={[
                  styles.bubble,
                  message.role === "assistant"
                    ? styles.assistantBubble
                    : styles.userBubble,
                ]}
              >
                <Text
                  style={
                    message.role === "assistant"
                      ? styles.assistantBubbleText
                      : styles.userBubbleText
                  }
                >
                  {message.text}
                </Text>
              </View>
            ))}
          </BottomSheetScrollView>
          <BottomSheetTextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type your answer..."
            placeholderTextColor={Colors.brand.mediumTeal}
            editable={!sending}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            style={styles.input}
          />
        </View>
      </BottomSheetModal>
    </View>
  );
}

// Spec: Figma frames 4518:3980 ("About You v4") and 4518:4813 (Continue
// Conversation drawer) — opaque white card (radius 12, 18/16 padding,
// min-height 252) with the CTA pinned to the bottom via a growing spacer;
// white top-rounded drawer with a beige handle, assistant bubbles in
// 30%-beige, white pill input.
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 252,
    gap: 8,
  },
  cardEyebrow: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.mediumTeal,
  },
  cardSummary: {
    ...Typography.copyblock,
    color: Colors.brand.darkTeal,
  },
  cardSpacer: {
    flex: 1,
  },
  cardCta: {
    ...Typography.smallCta,
    color: Colors.brand.mediumTeal,
  },
  directional: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
    marginTop: 20,
  },
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: {
    backgroundColor: Colors.brand.beige,
    width: 58,
    height: 5,
    borderRadius: 4,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: Spacing.sectionHeadInset,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sheetTitle: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
    marginBottom: 20,
  },
  transcript: {
    gap: 10,
    paddingBottom: 16,
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: 280,
  },
  // 30%-alpha beige per the comp (opacity on the fill, not the text).
  assistantBubble: {
    backgroundColor: Colors.brand.beige + "4D",
    alignSelf: "flex-start",
  },
  assistantBubbleText: {
    ...Typography.copyblock,
    color: Colors.brand.darkTeal,
  },
  userBubble: {
    backgroundColor: Colors.brand.darkTeal,
    alignSelf: "flex-end",
  },
  userBubbleText: {
    ...Typography.copyblock,
    color: Colors.white,
  },
  input: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.brand.lightTeal,
    ...Typography.copyblock,
    color: Colors.brand.darkTeal,
  },
  loadingText: {
    ...Typography.subhead,
    textAlign: "center",
    color: Colors.black,
    opacity: 0.9,
  },
});
