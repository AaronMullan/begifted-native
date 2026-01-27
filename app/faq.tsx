import { View, ScrollView, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { IconButton, Text } from "react-native-paper";
import { BlurView } from "expo-blur";
import { Colors } from "../lib/colors";
import { faqs } from "../data/faqs";
import { HEADER_HEIGHT } from "../lib/constants";

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
            <Pressable key={i} style={styles.faqItem}>
              <BlurView intensity={20} style={styles.blurBackground} />
              <View style={styles.faqContent}>
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
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
    paddingTop: HEADER_HEIGHT, // Account for header height
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
    color: Colors.darks.black,
  },
  subtitle: {
    color: Colors.darks.black,
    opacity: 0.9,
  },
  backButton: {
    margin: 0,
  },
  list: {
    gap: 24,
  },
  faqItem: {
    borderWidth: 1,
    borderColor: Colors.white,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    marginBottom: 0,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  faqContent: {
    backgroundColor: Colors.neutrals.light + "30", // Low opacity
    padding: 20,
    position: "relative",
    zIndex: 1,
  },
  question: {
    cursor: "pointer",
  },
  questionText: {
    fontWeight: "700",
    fontSize: 16,
    color: Colors.darks.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  answer: {
    marginTop: 12,
    color: Colors.darks.black,
    opacity: 0.8,
    lineHeight: 22,
  },
});
