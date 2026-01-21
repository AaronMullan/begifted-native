import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { IconButton, Text } from "react-native-paper";
import { faqs } from "../data/faqs";

export default function FAQ() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const router = useRouter();

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="headlineMedium" style={styles.title}>
              BeGifted FAQ
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Frequently asked questions about BeGifted
            </Text>
          </View>
          <IconButton
            icon="arrow-left"
            size={20}
            iconColor="#000000"
            onPress={() => router.back()}
            style={styles.backButton}
          />
        </View>
        <View style={styles.list}>
          {faqs.map((faq, i) => (
            <View key={i} style={styles.faqItem}>
              <TouchableOpacity
                onPress={() => toggleFAQ(i)}
                style={styles.question}
              >
                <Text style={styles.questionText}>{faq.q}</Text>
              </TouchableOpacity>
              {expandedIndex === i && (
                <Text style={styles.answer}>{faq.a}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    color: "#666",
  },
  backButton: {
    margin: 0,
  },
  list: {
    gap: 12,
  },
  faqItem: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  question: {
    cursor: "pointer",
  },
  questionText: {
    fontWeight: "500",
    fontSize: 16,
  },
  answer: {
    marginTop: 8,
    color: "#737373",
    lineHeight: 22,
  },
});
