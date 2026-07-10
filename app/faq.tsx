import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useState } from "react";
import { Text, ActivityIndicator } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";
import { BOTTOM_NAV_HEIGHT } from "../lib/constants";
import { useFaqs } from "../hooks/use-faqs";
import GradientBackground from "../components/GradientBackground";
import SubpageHeader, { SUBPAGE_GUTTER } from "../components/SubpageHeader";

export default function FAQ() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { data: faqs = [], isLoading, isError } = useFaqs();

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <GradientBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <SubpageHeader title="FAQ" />

        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={Colors.brand.darkTeal} />
            <Text style={styles.stateText}>Loading FAQ…</Text>
          </View>
        ) : isError ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              Could not load FAQs. Please try again later.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            <View style={styles.divider} />
            {faqs.map((faq, i) => {
              const expanded = expandedIndex === i;
              return (
                <View key={i}>
                  <Pressable
                    onPress={() => toggleFAQ(i)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    style={styles.row}
                  >
                    <Text style={styles.question}>{faq.q}</Text>
                    <MaterialIcons
                      name={expanded ? "expand-less" : "expand-more"}
                      size={20}
                      color={Colors.brand.mediumTeal}
                    />
                  </Pressable>
                  {expanded && <Text style={styles.answer}>{faq.a}</Text>}
                  <View style={styles.divider} />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    // Small gap below the in-flow global app Header; no full header-height
    // spacer (the Header already occupies its own vertical space above).
    paddingTop: 8,
    paddingBottom: BOTTOM_NAV_HEIGHT,
  },
  list: {
    marginTop: 32,
    paddingHorizontal: SUBPAGE_GUTTER,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.white,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: 16,
  },
  question: {
    ...Typography.subhead,
    flex: 1,
    color: Colors.brand.darkTeal,
    lineHeight: 20,
  },
  answer: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
    paddingBottom: 16,
  },
  stateContainer: {
    paddingTop: 60,
    paddingHorizontal: SUBPAGE_GUTTER,
    alignItems: "center",
  },
  stateText: {
    ...Typography.subhead,
    marginTop: 16,
    color: Colors.brand.mediumTeal,
    textAlign: "center",
  },
});
