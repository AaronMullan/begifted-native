import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons";
import { IconButton } from "../../components/ui/IconButton";
import { PrimaryButton } from "../../components/ui/buttons";

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
        Alert.alert(
          "Error",
          `Failed to save profile: ${error.message}`
        );
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
              <Text style={styles.title}>Profile Settings</Text>
              <Text style={styles.subtitle}>
                Manage your personal information
              </Text>
            </View>
            <IconButton
              icon={<Ionicons name="arrow-back" size={20} color="#231F20" />}
              onPress={() => router.back()}
              style={styles.backButton}
            />
          </View>

          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.sectionSubtitle}>
              Update your personal details and billing address.
            </Text>

            {/* Full Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                />
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color="#FF3B30"
                  style={styles.editIcon}
                />
              </View>
            </View>

            {/* Username */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, !username && styles.inputFocused]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Choose a username"
                />
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color="#FF3B30"
                  style={styles.editIcon}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={session.user?.email || ""}
                editable={false}
              />
              <Text style={styles.emailNote}>
                Email cannot be changed. Contact support if you need to update
                it.
              </Text>
            </View>
          </View>

          {/* Billing Address Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing Address</Text>

            {/* Street Address */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Street Address</Text>
              <TextInput
                style={styles.input}
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="Enter street address"
              />
            </View>

            {/* City */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Enter city"
              />
            </View>

            {/* State and ZIP in a row */}
            <View style={styles.row}>
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={styles.label}>ZIP Code</Text>
                <TextInput
                  style={styles.input}
                  value={zipCode}
                  onChangeText={setZipCode}
                  placeholder="ZIP"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <PrimaryButton
            title={
              saving
                ? "Saving..."
                : hasChanges
                ? "Save Changes"
                : "No Changes"
            }
            onPress={handleSave}
            disabled={saving || !hasChanges}
            loading={saving}
            style={styles.saveButton}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6E6FA", // Light purple background
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
    fontSize: 28,
    fontWeight: "bold",
    color: "#231F20",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#231F20",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#231F20",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
    color: "#231F20",
  },
  inputFocused: {
    borderColor: "#FFB6C1",
    borderWidth: 2,
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    color: "#666",
  },
  editIcon: {
    position: "absolute",
    right: 12,
  },
  emailNote: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: "#FFB6C1",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#E0E0E0",
    opacity: 0.6,
  },
  saveButtonSaving: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonTextDisabled: {
    color: "#666",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
  },
});

