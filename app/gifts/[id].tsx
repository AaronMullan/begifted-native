import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { BOTTOM_NAV_HEIGHT, HEADER_HEIGHT } from "../../lib/constants";
import { useRecipient } from "../../hooks/use-recipient";
import { useGiftSuggestions } from "../../hooks/use-gift-suggestions";
import { useBottomNavScrollVisibility } from "../../hooks/use-bottom-nav-scroll-visibility";
import PrimaryGiftCard from "../../components/gifts/PrimaryGiftCard";
import CollapsedGiftCard from "../../components/gifts/CollapsedGiftCard";

const firstName = (name?: string) => {
  if (!name) return "";
  return name.trim().split(/\s+/)[0];
};

type GiftIdeasHeaderProps = {
  name: string;
  onAboutPress: () => void;
};

function GiftIdeasHeader({ name, onAboutPress }: GiftIdeasHeaderProps) {
  const titleName = name ? `${name}'s` : "Their";
  const aboutLabel = name ? `ABOUT ${name.toUpperCase()}` : "ABOUT THEM";

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{titleName} Gift Ideas</Text>
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
          color={Colors.blues.teal}
        />
      </Pressable>
    </View>
  );
}

type GiftListProps = {
  suggestions: import("../../types/recipient").GiftSuggestion[];
  expandedId: string | null;
  onExpand: (id: string) => void;
  emptyName: string;
};

function GiftList({ suggestions, expandedId, onExpand, emptyName }: GiftListProps) {
  if (suggestions.length === 0) {
    return (
      <Text style={styles.emptyText}>
        No gift ideas yet for {emptyName || "this recipient"}.
      </Text>
    );
  }

  const activeId = expandedId ?? suggestions[0].id;
  const primary = suggestions.find((s) => s.id === activeId);
  const rest = suggestions.filter((s) => s.id !== activeId);

  return (
    <View style={styles.list}>
      {primary && <PrimaryGiftCard suggestion={primary} />}
      {rest.map((s) => (
        <CollapsedGiftCard
          key={s.id}
          suggestion={s}
          onPress={() => onExpand(s.id)}
        />
      ))}
    </View>
  );
}

export default function GiftIdeasPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipient, isLoading: loadingRecipient } = useRecipient(id);
  const { data: suggestions = [], isLoading: loadingSuggestions } =
    useGiftSuggestions(id);
  const { handleScroll } = useBottomNavScrollVisibility();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isLoading = loadingRecipient || loadingSuggestions;
  const name = firstName(recipient?.name);

  const handleAboutPress = () => {
    if (id) router.push(`/contacts/${id}?tab=details`);
  };

  if (isLoading && suggestions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.blues.dark} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.content}>
        <GiftIdeasHeader name={name} onAboutPress={handleAboutPress} />
        <GiftList
          suggestions={suggestions}
          expandedId={expandedId}
          onExpand={setExpandedId}
          emptyName={name}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: HEADER_HEIGHT,
    paddingBottom: BOTTOM_NAV_HEIGHT + 32,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    gap: 6,
  },
  title: {
    fontFamily: "Fraunces_600SemiBold",
    color: Colors.blues.dark,
    fontSize: 32,
    lineHeight: 38,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  aboutLabel: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.blues.teal,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  list: {
    gap: 12,
  },
  emptyText: {
    color: Colors.darks.black,
    opacity: 0.7,
    textAlign: "center",
    paddingVertical: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
