import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { faqs } from "../data/faqs";

export default function FAQ() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>BeGifted FAQ</Text>
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
    maxWidth: 768,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: "600",
    marginBottom: 24,
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
