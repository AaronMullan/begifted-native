import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";
import {
  Text,
  TextInput,
  IconButton,
  Button,
  Dialog,
  Portal,
  ActivityIndicator,
} from "react-native-paper";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sentry from "@sentry/react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { HEADER_HEIGHT, BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { useAuth } from "../../../hooks/use-auth";
import { useProfile } from "../../../hooks/use-profile";
import { useUpdateProfile } from "../../../hooks/use-profile-mutations";
import { showSnackbar } from "../../../components/GlobalSnackbar";
import { invokeWithRetry } from "../../../lib/edge-retry";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../lib/colors";

const MIN_PASSWORD_LENGTH = 6;

// Content type sent to upload-avatar; expo-image-picker returns JPEG for camera
// captures and library picks after our resize/edit step.
const AVATAR_CONTENT_TYPE = "image/jpeg";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ProfileSettings() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const loading = authLoading;

  // Form fields
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Original values, used to detect which fields changed on blur.
  const [originalValues, setOriginalValues] = useState({
    fullName: "",
    city: "",
    state: "",
  });

  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Pick from the library, upload via the service_role edge function (direct
  // client uploads to storage are RLS-rejected on this project), then persist
  // the returned public URL on the profile. Mirrors uploadRecipientPhoto.
  async function handleChangePhoto() {
    if (!user) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showSnackbar("Allow photo access in Settings to add a profile photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { data, error } = await invokeWithRetry<{
        publicUrl?: string;
        error?: string;
      }>(
        "upload-avatar",
        { body: { base64, contentType: AVATAR_CONTENT_TYPE } },
        2
      );
      if (error || !data?.publicUrl) {
        throw new Error(error?.message ?? data?.error ?? "Upload failed");
      }

      await updateProfile.mutateAsync({
        userId: user.id,
        data: { avatar_url: data.publicUrl },
      });
      showSnackbar("Profile photo updated.");
    } catch (err) {
      Sentry.captureException(err, {
        tags: { flow: "account_settings", step: "avatar_upload" },
      });
      showSnackbar("Couldn't update your photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });
      if (error) throw error;

      setConfirmDeleteVisible(false);
      // The account is gone; drop the local session and return to landing.
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/");
      showSnackbar("Your account has been deleted.");
    } catch {
      setConfirmDeleteVisible(false);
      showSnackbar(
        "Couldn't delete your account. Please try again or contact support."
      );
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Sync form state when the profile loads/changes. Done during render (not in
  // an effect) via a stored previous value.
  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile !== prevProfile) {
    setPrevProfile(profile);
    if (profile) {
      const fetchedFullName = profile.full_name || profile.name || "";
      const fetchedCity = profile.billing_address_city || "";
      const fetchedState = profile.billing_address_state || "";

      setFullName(fetchedFullName);
      setCity(fetchedCity);
      setState(fetchedState);
      setOriginalValues({
        fullName: fetchedFullName,
        city: fetchedCity,
        state: fetchedState,
      });
    }
  }

  // Persist on blur. The finalized frame shows no Save button, so edits commit
  // when the user leaves a field. Only send location keys when they actually
  // changed, so the giver-profile re-synthesis (fired in the mutation handler
  // on location change) doesn't run on every unrelated save.
  async function persistOnBlur() {
    if (!user) return;

    const trimmedFullName = fullName.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();

    const nameChanged = trimmedFullName !== originalValues.fullName;
    const locationChanged =
      trimmedCity !== originalValues.city ||
      trimmedState !== originalValues.state;

    if (!nameChanged && !locationChanged) return;

    setSaveState("saving");
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        data: {
          full_name: trimmedFullName || null,
          ...(locationChanged && {
            billing_address_city: trimmedCity || null,
            billing_address_state: trimmedState || null,
          }),
        },
      });

      setOriginalValues({
        fullName: trimmedFullName,
        city: trimmedCity,
        state: trimmedState,
      });
      setSaveState("saved");
    } catch {
      // The shared mutation handler logs and shows an error snackbar; reflect it
      // inline too so the auto-save state doesn't read as "saved".
      setSaveState("error");
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showSnackbar(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showSnackbar("Passwords don't match.");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setPasswordDialogVisible(false);
      setNewPassword("");
      setConfirmPassword("");
      showSnackbar("Password updated.");
    } catch (err) {
      // Supabase rejects the change when the session is too old and "secure
      // password change" is enabled; point the user at re-auth in that case.
      const message =
        err instanceof Error && /reauthentication|session/i.test(err.message)
          ? "For security, sign out and back in, then try again."
          : "Couldn't update your password. Please try again.";
      showSnackbar(message);
    } finally {
      setChangingPassword(false);
    }
  }

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
          <Text style={styles.title}>Account Info</Text>
          <Text style={styles.subtitle}>
            Please sign in to manage your profile.
          </Text>
        </View>
      </View>
    );
  }

  const saveStatusLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Not saved"
          : "";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.mainCard}>
              {/* Header section */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text variant="headlineMedium" style={styles.title}>
                    Account Info
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

              {/* Profile photo */}
              <View style={styles.photoSection}>
                <Pressable
                  onPress={handleChangePhoto}
                  disabled={uploadingPhoto}
                  accessibilityRole="button"
                  accessibilityLabel={
                    profile?.avatar_url
                      ? "Change profile photo"
                      : "Add profile photo"
                  }
                  style={styles.photoTarget}
                >
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.photo}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.photo, styles.photoEmpty]}>
                      <MaterialIcons
                        name="add-a-photo"
                        size={28}
                        color={Colors.grays.text}
                      />
                    </View>
                  )}
                  {uploadingPhoto ? (
                    <View style={[styles.photo, styles.photoOverlay]}>
                      <ActivityIndicator color={Colors.white} />
                    </View>
                  ) : null}
                </Pressable>
                <Text variant="bodyMedium" style={styles.photoHint}>
                  {profile?.avatar_url
                    ? "Tap to change photo"
                    : "Tap to add photo"}
                </Text>
              </View>

              {/* Personal Information Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text variant="titleLarge" style={styles.sectionTitle}>
                    Personal Information
                  </Text>
                  {saveStatusLabel ? (
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.saveStatus,
                        saveState === "error" && styles.saveStatusError,
                      ]}
                    >
                      {saveStatusLabel}
                    </Text>
                  ) : null}
                </View>
                <Text variant="bodyMedium" style={styles.sectionSubtitle}>
                  Changes save automatically.
                </Text>

                {/* Full Name */}
                <View style={styles.fieldContainer}>
                  <TextInput
                    mode="outlined"
                    label="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    onBlur={persistOnBlur}
                    placeholder="Enter your full name"
                    style={styles.input}
                  />
                </View>

                {/* Location — kept for location-based gift timing (DEV-261) */}
                <View style={styles.locationRow}>
                  <View style={styles.cityField}>
                    <TextInput
                      mode="outlined"
                      label="City"
                      value={city}
                      onChangeText={setCity}
                      onBlur={persistOnBlur}
                      placeholder="City"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.stateField}>
                    <TextInput
                      mode="outlined"
                      label="State"
                      value={state}
                      onChangeText={setState}
                      onBlur={persistOnBlur}
                      placeholder="State"
                      autoCapitalize="characters"
                      style={styles.input}
                    />
                  </View>
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
                    Email cannot be changed. Contact support if you need to
                    update it.
                  </Text>
                </View>
              </View>

              {/* Security */}
              <View style={styles.section}>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  Security
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setPasswordDialogVisible(true)}
                  style={styles.changePasswordButton}
                >
                  Change Password
                </Button>
              </View>

              <Button
                mode="text"
                textColor={Colors.pinks.dark}
                onPress={() => setConfirmDeleteVisible(true)}
                style={styles.deleteButton}
              >
                Delete My Account
              </Button>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <Portal>
        <Dialog
          visible={passwordDialogVisible}
          onDismiss={() => !changingPassword && setPasswordDialogVisible(false)}
        >
          <Dialog.Title>Change Password</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              style={styles.dialogInput}
            />
            <TextInput
              mode="outlined"
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setPasswordDialogVisible(false)}
              disabled={changingPassword}
            >
              Cancel
            </Button>
            <Button
              onPress={handleChangePassword}
              loading={changingPassword}
              disabled={changingPassword}
            >
              Update
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={confirmDeleteVisible}
          onDismiss={() => !deleting && setConfirmDeleteVisible(false)}
        >
          <Dialog.Title>Delete your account?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Deleting your account will remove your saved people, occasions,
              preferences, feedback, and reminders, so BeGifted will no longer
              be able to help with future gifting moments.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDeleteVisible(false)}>
              Keep my account
            </Button>
            <Button
              textColor={Colors.pinks.dark}
              onPress={handleDeleteAccount}
              loading={deleting}
              disabled={deleting}
            >
              Delete my account
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
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
  // 44pt min tap target (HIG); transparent container, 20pt icon unchanged.
  backButton: {
    margin: 0,
    width: 44,
    height: 44,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  photoTarget: {
    width: 96,
    height: 96,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  photoEmpty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.grays.field,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.grays.border,
  },
  photoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  photoHint: {
    marginTop: 8,
    color: Colors.grays.text,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    marginBottom: 8,
  },
  saveStatus: {
    color: "#666",
  },
  saveStatusError: {
    color: Colors.pinks.dark,
  },
  sectionSubtitle: {
    marginBottom: 20,
    color: "#666",
  },
  fieldContainer: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  cityField: {
    flex: 2,
  },
  stateField: {
    flex: 1,
  },
  input: {},
  emailNote: {
    marginTop: 4,
    color: "#999",
  },
  changePasswordButton: {
    marginTop: 4,
  },
  dialogInput: {
    marginBottom: 12,
  },
  deleteButton: {
    marginTop: 16,
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
  },
});
