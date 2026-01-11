import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { Text, TextInput, IconButton, Button } from "react-native-paper";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileSettings() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
        router.replace("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      setLoading(true);
      // Fetch all available profile fields
      const { data, error, status } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && status !== 406) {
        console.error("Error fetching profile:", error);
        // If profile doesn't exist, that's okay - we'll create it on save
      }

      if (data) {
        // Set username (we know this field exists)
        const fetchedUsername = data.username || "";
        setUsername(fetchedUsername);

        // Set full_name if it exists (might be stored as full_name or name)
        const fetchedFullName = data.full_name || data.name || "";
        setFullName(fetchedFullName);

        // Set billing address fields if they exist
        const fetchedStreet = data.billing_address_street || "";
        const fetchedCity = data.billing_address_city || "";
        const fetchedState = data.billing_address_state || "";
        const fetchedZip = data.billing_address_zip || "";

        setStreetAddress(fetchedStreet);
        setCity(fetchedCity);
        setState(fetchedState);
        setZipCode(fetchedZip);

        // Store original values to track changes
        setOriginalValues({
          fullName: fetchedFullName,
          username: fetchedUsername,
          streetAddress: fetchedStreet,
          city: fetchedCity,
          state: fetchedState,
          zipCode: fetchedZip,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!session?.user) {
      Alert.alert("Error", "You must be logged in to save changes");
      return;
    }

    try {
      setSaving(true);

      // Prepare updates object
      const trimmedUsername = username.trim();
      const trimmedFullName = fullName.trim();
      const trimmedStreet = streetAddress.trim();
      const trimmedCity = city.trim();
      const trimmedState = state.trim();
      const trimmedZip = zipCode.trim();

      // Build updates object - try to save all fields
      // If a field doesn't exist, Supabase will return an error which we'll handle
      const updates: any = {
        id: session.user.id,
        username: trimmedUsername || null,
        updated_at: new Date().toISOString(),
      };

      // Include all fields that exist in the schema
      updates.full_name = trimmedFullName || null;
      updates.billing_address_street = trimmedStreet || null;
      updates.billing_address_city = trimmedCity || null;
      updates.billing_address_state = trimmedState || null;
      updates.billing_address_zip = trimmedZip || null;

      console.log("Saving profile updates:", updates);

      const { data, error } = await supabase
        .from("profiles")
        .upsert(updates)
        .select();

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log("Profile saved successfully:", data);

      // Update original values after successful save
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
    } finally {
      setSaving(false);
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

  if (!session) {
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
              icon="arrow-back"
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
            disabled={saving || !hasChanges}
            loading={saving}
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
    backgroundColor: "#FFFFFF", // White background
  },
  content: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
  },
  mainCard: {
    backgroundColor: "white",
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
