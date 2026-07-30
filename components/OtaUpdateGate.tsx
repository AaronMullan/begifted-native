import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Text } from "react-native-paper";
import * as Updates from "expo-updates";
import { useAppConfig } from "../hooks/use-app-config";
import type { WhatsNewSection } from "../lib/api";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";

// Chip fill pixel-sampled from the What's New mock (no palette token binds to
// it, same situation as Colors.brand.destructiveRed).
const CHIP_BACKGROUND = "#E5E8E5";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Manual parse: `new Date("YYYY-MM-DD")` is UTC midnight, which renders as the
// previous day in US timezones.
function formatChipDate(iso: string | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso?.trim() ?? "");
  if (!match) return null;
  const month = MONTH_NAMES[Number(match[2]) - 1];
  return month ? `${month} ${Number(match[3])}` : null;
}

// Shown when app_config.whats_new is missing or empty, so the card never
// renders without content.
const FALLBACK_SECTIONS: WhatsNewSection[] = [
  {
    title: "Improvements and fixes",
    body: "The latest BeGifted improvements are downloaded and ready — it only takes a moment.",
  },
];

/**
 * Downloads a published OTA update as soon as the app is opened or
 * foregrounded, then offers a one-tap restart via the "What's New" card
 * (design: image_1024 mock, 2026-07-28). Without this, expo-updates' default
 * flow needs two full force-quits before an update runs — beta testers rarely
 * do that, so published fixes sat unapplied indefinitely.
 */
const OtaUpdateGate: React.FC = () => {
  const [cardVisible, setCardVisible] = useState(false);
  const { data: appConfig } = useAppConfig();
  // Refs, not state: the AppState listener would otherwise close over stale
  // values and re-check (or re-prompt) after the update is already fetched.
  const checking = useRef(false);
  const settled = useRef(false);

  useEffect(() => {
    // checkForUpdateAsync throws in dev clients and Expo Go.
    if (!Updates.isEnabled) return;

    const check = async () => {
      if (checking.current || settled.current) return;
      checking.current = true;
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) {
          await Updates.fetchUpdateAsync();
          settled.current = true;
          setCardVisible(true);
        }
      } catch {
        // Network flake or update-server outage — retry on next foreground.
      } finally {
        checking.current = false;
      }
    };

    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => subscription.remove();
  }, []);

  // Backdrop tap is "later", and it's safe to honor quietly: the update is
  // already downloaded and will run on the next cold start even without the
  // restart.
  const dismiss = () => setCardVisible(false);

  const restart = () => {
    Updates.reloadAsync().catch(dismiss);
  };

  const whatsNew = appConfig?.whats_new;
  const sections = whatsNew?.sections?.length
    ? whatsNew.sections
    : FALLBACK_SECTIONS;
  const chipDate = formatChipDate(whatsNew?.date);

  return (
    <Modal
      visible={cardVisible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <Pressable style={styles.scrim} onPress={dismiss}>
        {/* Stop card taps from falling through to the dismissing scrim. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>What&apos;s New</Text>
          {chipDate && (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>{chipDate}</Text>
            </View>
          )}
          {/* Shrinkable, so a long release list scrolls instead of pushing
              the restart CTA off screen. */}
          <ScrollView style={styles.sectionsScroll}>
            <View style={styles.sections}>
              {sections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionBody}>{section.body}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <Button
            mode="contained"
            buttonColor={Colors.brand.darkTeal}
            textColor={Colors.white}
            onPress={restart}
            accessibilityLabel="Restart to apply the update"
            style={styles.cta}
            contentStyle={styles.ctaContent}
            labelStyle={styles.ctaLabel}
          >
            Let&apos;s Go
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: Colors.brand.beigeLight,
    borderRadius: 36,
    paddingVertical: 36,
    paddingHorizontal: 28,
    maxHeight: "80%",
  },
  title: {
    ...Typography.h1,
    color: Colors.brand.darkTeal,
    textAlign: "center",
  },
  chip: {
    alignSelf: "center",
    backgroundColor: CHIP_BACKGROUND,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 12,
  },
  chipLabel: {
    ...Typography.tagLabel,
    color: Colors.brand.mediumTeal,
  },
  // RN defaults flexShrink to 0; without it the list overflows the capped
  // card instead of scrolling.
  sectionsScroll: {
    flexGrow: 0,
    flexShrink: 1,
    marginTop: 28,
  },
  sections: {
    gap: 20,
  },
  section: {},
  sectionTitle: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
    marginBottom: 4,
  },
  sectionBody: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
  },
  cta: {
    alignSelf: "center",
    marginTop: 32,
    minWidth: 160,
    borderRadius: 24,
  },
  ctaContent: {
    height: 46,
  },
  ctaLabel: {
    ...Typography.largeCta,
  },
});

export default OtaUpdateGate;
