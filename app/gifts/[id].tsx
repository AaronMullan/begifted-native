import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { BOTTOM_NAV_HEIGHT } from "../../lib/constants";
import { useRecipient } from "../../hooks/use-recipient";
import { useGiftSuggestions } from "../../hooks/use-gift-suggestions";
import GiftSuggestionsList from "../../components/gifts/GiftSuggestionsList";
import PastGiftsSection from "../../components/gifts/PastGiftsSection";

/** Gap left above an expanded card once it's scrolled to the top of the visible
 * area, so it sits a touch below the sticky header rather than flush against it. */
const CARD_SCROLL_TOP_GAP = 12;

const firstName = (name?: string) => {
  if (!name) return "";
  return name.trim().split(/\s+/)[0];
};

type GiftIdeasHeaderProps = {
  name: string;
  onAboutPress: () => void;
};

function GiftIdeasHeader({ name, onAboutPress }: GiftIdeasHeaderProps) {
  const possessive = name ? `${name}'s` : "Their";
  const aboutLabel = name ? `About ${name}` : "About them";

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{possessive}</Text>
      <Text style={styles.title}>Gift Ideas</Text>
      <Pressable
        onPress={onAboutPress}
        accessibilityRole="link"
        accessibilityLabel={aboutLabel}
        style={styles.aboutRow}
      >
        <Text style={styles.aboutLabel}>{aboutLabel}</Text>
        <MaterialIcons
          name="chevron-right"
          size={14}
          color={Colors.brand.gold}
        />
      </Pressable>
    </View>
  );
}

export default function GiftIdeasPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipient, isLoading: loadingRecipient } = useRecipient(id);
  const { data: suggestions = [], isLoading: loadingSuggestions } =
    useGiftSuggestions(id);
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);

  const isLoading = loadingRecipient || loadingSuggestions;
  const name = firstName(recipient?.name);

  const handleAboutPress = () => {
    if (id) router.push(`/contacts/${id}?tab=details`);
  };

  // Scroll a freshly-expanded gift card so its top lands just below the header.
  // Measuring against the content view (not the screen) yields the card's offset
  // within the scroll content; the viewport already begins below the in-flow
  // header, and content bottom padding keeps the card clear of the bottom nav.
  // The card top is a stable anchor (it depends only on the fixed-height
  // collapsed rows above it), so a late-loading image never moves it (DEV-185).
  const handleScrollCardIntoView = (node: View | null) => {
    const content = contentRef.current;
    if (!node || !content) return;
    // Pass the content view instance directly — the New Architecture's
    // measureLayout requires a ref to a native component, not a node handle.
    node.measureLayout(
      content,
      (_x, y) => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, y - CARD_SCROLL_TOP_GAP),
          animated: true,
        });
      },
      () => {}
    );
  };

  if (isLoading && suggestions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.brand.darkTeal} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View ref={contentRef} style={styles.content}>
          <GiftIdeasHeader name={name} onAboutPress={handleAboutPress} />
          <GiftSuggestionsList
            suggestions={suggestions}
            recipientName={name}
            onScrollCardIntoView={handleScrollCardIntoView}
          />
        </View>
        {/* Full-bleed band — outside the horizontally-padded content column. */}
        <View style={styles.pastSection}>
          <PastGiftsSection suggestions={suggestions} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    // The root Header is an in-flow sibling above this Stack, so content already
    // begins below it — only a small gap is needed (Figma: title ~20pt below the
    // header). Adding HEADER_HEIGHT here double-counted the header (~120pt).
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 32,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    gap: 2,
  },
  title: {
    ...Typography.h1,
    color: Colors.brand.darkTeal,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 6,
  },
  aboutLabel: {
    ...Typography.largeCta,
    color: Colors.brand.gold,
  },
  pastSection: {
    // Active cards → band gap from the frame (4306:1620: 20pt).
    marginTop: 20,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
