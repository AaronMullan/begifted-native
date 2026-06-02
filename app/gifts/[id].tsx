import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { BOTTOM_NAV_HEIGHT, HEADER_HEIGHT } from "../../lib/constants";
import { useRecipient } from "../../hooks/use-recipient";
import { useGiftSuggestions } from "../../hooks/use-gift-suggestions";
import { useBottomNavScrollVisibility } from "../../hooks/use-bottom-nav-scroll-visibility";
import GiftSuggestionsList from "../../components/gifts/GiftSuggestionsList";

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

export default function GiftIdeasPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipient, isLoading: loadingRecipient } = useRecipient(id);
  const { data: suggestions = [], isLoading: loadingSuggestions } =
    useGiftSuggestions(id);
  const { handleScroll } = useBottomNavScrollVisibility();
  const scrollRef = useRef<ScrollView>(null);

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
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.content}>
        <GiftIdeasHeader name={name} onAboutPress={handleAboutPress} />
        <GiftSuggestionsList
          suggestions={suggestions}
          recipientName={name}
          onExpand={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
