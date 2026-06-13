import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography, FontFamily } from "../../lib/typography";
import { BOTTOM_NAV_HEIGHT, HEADER_HEIGHT } from "../../lib/constants";
import { useRecipient } from "../../hooks/use-recipient";
import { useGiftSuggestions } from "../../hooks/use-gift-suggestions";
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
    >
      <View style={styles.content}>
        <GiftIdeasHeader name={name} onAboutPress={handleAboutPress} />
        <GiftSuggestionsList suggestions={suggestions} recipientName={name} />
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
    fontFamily: FontFamily.sans.semibold,
    color: Colors.brand.gold,
    fontSize: 11,
    lineHeight: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
