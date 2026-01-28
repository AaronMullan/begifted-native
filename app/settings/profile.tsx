import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { Text, TextInput, IconButton, Button } from "react-native-paper";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { HEADER_HEIGHT } from "../../lib/constants";
import { useAuth } from "../../hooks/use-auth";
import { useProfile } from "../../hooks/use-profile";
import { useUpdateProfile } from "../../hooks/use-profile-mutations";

export default function ProfileSettings() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading: loading } = useProfile();
  const updateProfile = useUpdateProfile();

  // Form fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Original values to track changes
  const [originalValues, setOriginalValues] = useState({
    fullName: "",
    username: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
  });

  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  // Sync form state when profile loads
  useEffect(() => {
    if (profile) {
      const fetchedUsername = profile.username || "";
      const fetchedFullName = profile.full_name || profile.name || "";
      const fetchedStreet = profile.billing_address_street || "";
      const fetchedCity = profile.billing_address_city || "";
      const fetchedState = profile.billing_address_state || "";
      const fetchedZip = profile.billing_address_zip || "";

      setUsername(fetchedUsername);
      setFullName(fetchedFullName);
      setStreetAddress(fetchedStreet);
      setCity(fetchedCity);
      setState(fetchedState);
      setZipCode(fetchedZip);
      setOriginalValues({
        fullName: fetchedFullName,
        username: fetchedUsername,
        streetAddress: fetchedStreet,
        city: fetchedCity,
        state: fetchedState,
        zipCode: fetchedZip,
      });
    }
  }, [profile]);

  async function handleSave() {
    if (!user) {
      Alert.alert("Error", "You must be logged in to save changes");
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();
    const trimmedStreet = streetAddress.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    const trimmedZip = zipCode.trim();

    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        data: {
          username: trimmedUsername || null,
          full_name: trimmedFullName || null,
          billing_address_street: trimmedStreet || null,
          billing_address_city: trimmedCity || null,
          billing_address_state: trimmedState || null,
          billing_address_zip: trimmedZip || null,
        },
      });

      setOriginalValues({
        fullName: trimmedFullName,
        username: trimmedUsername,
        streetAddress: trimmedStreet,
        city: trimmedCity,
        state: trimmedState,
        zipCode: trimmedZip,
      });

      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      if (error instanceof Error) {
        Alert.alert("Error", `Failed to save profile: ${error.message}`);
      } else {
        Alert.alert("Error", "Failed to save profile. Please try again.");
      }
    }
  }

  // Check if there are unsaved changes
  const hasChanges =
    fullName.trim() !== originalValues.fullName ||
    username.trim() !== originalValues.username ||
    streetAddress.trim() !== originalValues.streetAddress ||
    city.trim() !== originalValues.city ||
    state.trim() !== originalValues.state ||
    zipCode.trim() !== originalValues.zipCode;

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
    <ScrollView style={styles.container}>
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
              Update your personal details and billing address.
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

            {/* Username */}
            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                right={<TextInput.Icon icon="ellipsis-horizontal" />}
                style={styles.input}
              />
            </View>

            {/* Email */}
            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="Email"
                value={session.user?.email || ""}
                editable={false}
                style={styles.input}
              />
              <Text variant="bodySmall" style={styles.emailNote}>
                Email cannot be changed. Contact support if you need to update
                it.
              </Text>
            </View>
          </View>

          {/* Billing Address Section */}
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Billing Address
            </Text>

            {/* Street Address */}
            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="Street Address"
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="Enter street address"
                style={styles.input}
              />
            </View>

            {/* City */}
            <View style={styles.fieldContainer}>
              <TextInput
                mode="outlined"
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="Enter city"
                style={styles.input}
              />
            </View>

            {/* State and ZIP in a row */}
            <View style={styles.row}>
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <TextInput
                  mode="outlined"
                  label="State"
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  maxLength={2}
                  autoCapitalize="characters"
                  style={styles.input}
                />
              </View>
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <TextInput
                  mode="outlined"
                  label="ZIP Code"
                  value={zipCode}
                  onChangeText={setZipCode}
                  placeholder="ZIP"
                  keyboardType="numeric"
                  maxLength={10}
                  style={styles.input}
                />
              </View>
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
  row: {
    flexDirection: "row",
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
  },
});
