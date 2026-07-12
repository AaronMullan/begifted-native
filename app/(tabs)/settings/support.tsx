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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import { Spacing } from "../../../lib/spacing";
import type { Session } from "@supabase/supabase-js";
import { showSnackbar } from "../../../components/GlobalSnackbar";

// v4 "input/text-field": label above the box, white fill, sharp corners, no
// stroke — so the Paper input runs flat with its own label suppressed.
type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
};

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      mode="flat"
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.brand.mediumTeal}
      multiline={multiline}
      underlineColor="transparent"
      activeUnderlineColor="transparent"
      textColor={Colors.brand.darkTeal}
      style={[styles.fieldBox, multiline && styles.fieldBoxMultiline]}
      contentStyle={styles.fieldContent}
    />
  </View>
);

export default function SupportSettings() {
  const insets = useSafeAreaInsets();
  const headerSpacerHeight = Math.max(HEADER_HEIGHT, insets.top + 60);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
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

  const canSend =
    subject.trim().length > 0 && message.trim().length > 0 && !sending;

  const handleSend = async () => {
    setSending(true);
    const { error } = await supabase.functions.invoke("send-support-message", {
      body: { subject: subject.trim(), message: message.trim() },
    });
    setSending(false);
    if (error) {
      showSnackbar("Couldn't send your message — please try again.");
      return;
    }
    setSent(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
        <View style={styles.content}>
          <Text style={styles.title}>Contact Us</Text>
          <Text style={styles.intro}>Please sign in to access support.</Text>
        </View>
      </View>
    );
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
        <View style={styles.content}>
          <Text style={styles.title}>Message sent</Text>
          <Text style={styles.intro}>
            Thanks — we received your message. We&apos;ll get back to you within
            3 business days.
          </Text>
          <Button
            mode="contained"
            buttonColor={Colors.brand.darkTeal}
            textColor={Colors.white}
            onPress={() => router.back()}
            style={styles.sendButton}
            labelStyle={styles.sendButtonText}
          >
            Done
          </Button>
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
          <View style={[styles.headerSpacer, { height: headerSpacerHeight }]} />
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <IconButton
                  icon="chevron-left"
                  size={20}
                  iconColor={Colors.brand.darkTeal}
                  onPress={() => router.back()}
                  style={styles.backButton}
                />
                <Text style={styles.title}>Contact Us</Text>
              </View>

              <Text style={styles.intro}>
                Have a question or need help? Send us a note and we&apos;ll get
                back to you within 3 business days.
              </Text>

              <Field
                label="Subject"
                value={subject}
                onChangeText={setSubject}
                placeholder="What can we help with?"
              />
              <Field
                label="Message"
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us what's going on."
                multiline
              />

              <Button
                mode="contained"
                buttonColor={Colors.brand.darkTeal}
                textColor={Colors.white}
                disabled={!canSend}
                loading={sending}
                onPress={handleSend}
                style={styles.sendButton}
                labelStyle={styles.sendButtonText}
              >
                Send message
              </Button>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// Spec: Figma frame 4518:4038 ("Contact Us v4") — chevron + h2 header,
// mediumTeal intro copy, label-above white sharp-cornered fields (Subject,
// 140pt Message), centered 170×46 darkTeal Send pill.
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
    paddingHorizontal: Spacing.sectionHeadInset,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
    // IconButton pads its 44pt tap target; pull it back so the chevron sits
    // on the gutter line.
    marginLeft: -12,
  },
  backButton: {
    margin: 0,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  intro: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
    marginBottom: 24,
  },
  field: {
    marginBottom: 24,
    gap: 4,
  },
  fieldLabel: {
    ...Typography.fieldLabel,
    color: Colors.brand.mediumTeal,
  },
  fieldBox: {
    backgroundColor: Colors.white,
    borderRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  fieldBoxMultiline: {
    minHeight: 140,
  },
  // Field values use the subhead scale per the handoff's style table.
  fieldContent: {
    ...Typography.subhead,
  },
  sendButton: {
    alignSelf: "center",
    width: 170,
    height: 46,
    borderRadius: 24,
    justifyContent: "center",
    marginTop: 12,
  },
  sendButtonText: {
    ...Typography.largeCta,
    color: Colors.white,
  },
  loadingText: {
    ...Typography.subhead,
    textAlign: "center",
    color: Colors.darks.black,
    opacity: 0.9,
  },
});
