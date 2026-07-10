import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { Text, TextInput, IconButton, Button } from "react-native-paper";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import { Session } from "@supabase/supabase-js";
import { showSnackbar } from "../../../components/GlobalSnackbar";

// Confirmation copy the real send flow (DEV-263) should show once wired:
// "Thanks — we received your message. We'll get back to you within 3 business days."

export default function SupportSettings() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        router.replace("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const canSend = subject.trim().length > 0 && message.trim().length > 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Contact Us</Text>
          <Text style={styles.subtitle}>Please sign in to access support.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.flex}>
          <View style={styles.headerSpacer} />
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.mainCard}>
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.title}>Contact Us</Text>
                    <Text style={styles.subtitle}>
                      Have a question or need help? Send us a note and
                      we&apos;ll get back to you within 3 business days.
                    </Text>
                  </View>
                  <IconButton
                    icon="arrow-left"
                    size={20}
                    iconColor={Colors.black}
                    onPress={() => router.back()}
                    style={styles.backButton}
                  />
                </View>

                <View style={styles.section}>
                  <TextInput
                    mode="outlined"
                    label="Subject"
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="What can we help with?"
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    label="Message"
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Tell us what's going on."
                    multiline
                    numberOfLines={6}
                    style={styles.messageInput}
                  />
                </View>

                <Button
                  mode="contained"
                  buttonColor={Colors.black}
                  textColor={Colors.white}
                  disabled={!canSend}
                  onPress={() =>
                    showSnackbar("Support messaging is coming soon.")
                  }
                  style={styles.sendButton}
                  labelStyle={styles.sendButtonText}
                >
                  Send message
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    padding: 20,
  },
  mainCard: {
    backgroundColor: "transparent",
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
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
    ...Typography.h1,
    color: Colors.black,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.subhead,
    color: Colors.darks.black,
    opacity: 0.9,
  },
  // 44pt min tap target (HIG); transparent container, 20pt icon unchanged.
  backButton: {
    margin: 0,
    width: 44,
    height: 44,
  },
  section: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  messageInput: {
    minHeight: 140,
  },
  sendButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  sendButtonText: {
    ...Typography.largeCta,
    paddingVertical: 6,
  },
  loadingText: {
    textAlign: "center",
    color: Colors.darks.black,
    opacity: 0.9,
    ...Typography.subhead,
  },
});
