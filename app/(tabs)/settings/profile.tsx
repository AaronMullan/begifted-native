import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { Text, TextInput, IconButton, Button } from "react-native-paper";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { useAuth } from "../../../hooks/use-auth";
import { useProfile } from "../../../hooks/use-profile";
import { useUpdateProfile } from "../../../hooks/use-profile-mutations";

export default function ProfileSettings() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: _profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const loading = authLoading;

  // Form fields
  const [fullName, setFullName] = useState("");

  // Original values to track changes
  const [originalValues, setOriginalValues] = useState({
    fullName: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Sync form state when profile loads
  useEffect(() => {
    if (profile) {
      const fetchedFullName = profile.full_name || profile.name || "";

      setFullName(fetchedFullName);
      setOriginalValues({
        fullName: fetchedFullName,
      });
    }
  }, [profile]);

  async function handleSave() {
    if (!user) {
      Alert.alert("Error", "You must be logged in to save changes");
      return;
    }

    const trimmedFullName = fullName.trim();

    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        data: {
          full_name: trimmedFullName || null,
        },
      });

      setOriginalValues({
        fullName: trimmedFullName,
      });

      Alert.alert("Success", "Profile updated successfully!");
    } catch (error: unknown) {
      let message = "Unknown error";
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === "object") {
        const supabaseError = error as {
          message?: string;
          details?: string;
          code?: string;
        };
        message = supabaseError.message || message;
        if (supabaseError.details) {
          message += `\n\n${supabaseError.details}`;
        }
      }
      const isNetworkError = /network request failed/i.test(message);
      console.error("Error saving profile:", error);
      Alert.alert(
        "Error",
        isNetworkError
          ? "Network request failed. Check your internet connection and try again."
          : `Failed to save profile: ${message}`
      );
    }
  }

  // Check if there are unsaved changes
  const hasChanges = fullName.trim() !== originalValues.fullName;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Profile Settings</Text>
          <Text style={styles.subtitle}>
            Please sign in to manage your profile.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        {/* Main white card container */}
        <View style={styles.mainCard}>
          {/* Header section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text variant="headlineMedium" style={styles.title}>
                Profile Settings
              </Text>
              <Text variant="bodyLarge" style={styles.subtitle}>
                Manage your personal information
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

          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Personal Information
            </Text>
            <Text variant="bodyMedium" style={styles.sectionSubtitle}>
              Update your personal details.
            </Text>

            {/* Full Name */}
            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                right={<TextInput.Icon icon="ellipsis-horizontal" />}
                style={styles.input}
              />
            </View>

            {/* Email */}
            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="Email"
                value={user?.email || ""}
                editable={false}
                style={styles.input}
              />
              <Text variant="bodySmall" style={styles.emailNote}>
                Email cannot be changed. Contact support if you need to update
                it.
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <Button
            mode="contained"
            buttonColor="#000000"
            onPress={handleSave}
            disabled={updateProfile.isPending || !hasChanges}
            loading={updateProfile.isPending}
            style={styles.saveButton}
          >
            {hasChanges ? "Save Changes" : "No Changes"}
          </Button>
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
  scrollContent: {
    paddingBottom: BOTTOM_NAV_HEIGHT + 40,
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
    paddingTop: HEADER_HEIGHT, // Account for header height
  },
  mainCard: {
    backgroundColor: "transparent",
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionSubtitle: {
    marginBottom: 20,
    color: "#666",
  },
  fieldContainer: {
    marginBottom: 20,
  },
  input: {},
  emailNote: {
    marginTop: 4,
    color: "#999",
  },
  saveButton: {
    marginTop: 8,
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
  },
});
