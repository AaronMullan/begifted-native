import * as FileSystem from "expo-file-system/legacy";
import * as Sentry from "@sentry/react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { uploadRecipientPhoto } from "../lib/recipient-photo";
import { useAuth } from "./use-auth";
import {
  compareContactsByName,
  DeviceContact,
  useDeviceContacts,
} from "./use-device-contacts";
import { useBulkCreateRecipients } from "./use-recipient-mutations";

// iOS contacts can omit the year. Emit the vCard partial form (--MM-DD) so we
// don't fudge a current-year birthday and so normalizeBirthday at the save
// boundary keeps it intact.
function contactBirthdayString(contact: DeviceContact): string | undefined {
  if (!contact.birthday) return undefined;
  const { year, month, day } = contact.birthday;
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return year ? `${year}-${m}-${d}` : `--${m}-${d}`;
}

export function useContactImportFlow() {
  const router = useRouter();
  const { user } = useAuth();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [accessIntroVisible, setAccessIntroVisible] = useState(false);
  const [importFailedVisible, setImportFailedVisible] = useState(false);
  const [isAddingContacts, setIsAddingContacts] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const { loading: contactsLoading, getDeviceContacts } = useDeviceContacts();
  const bulkCreateRecipients = useBulkCreateRecipients();

  const openAccessIntro = () => setAccessIntroVisible(true);
  const closeAccessIntro = () => setAccessIntroVisible(false);
  const closePicker = () => setPickerVisible(false);
  const closeImportFailed = () => setImportFailedVisible(false);

  const continueWithAccess = async () => {
    setAccessIntroVisible(false);
    const contacts = await getDeviceContacts();
    if (contacts === null) {
      setImportFailedVisible(true);
      return;
    }
    setDeviceContacts(contacts);
    if (contacts.length > 0) {
      setPickerVisible(true);
    }
  };

  const retryImport = async () => {
    setImportFailedVisible(false);
    await continueWithAccess();
  };

  const importFromFile = (contacts: DeviceContact[]) => {
    // File/browser imports bypass getDeviceContacts, so sort here too — the
    // picker must be alphabetical regardless of source.
    setDeviceContacts([...contacts].sort(compareContactsByName));
    if (contacts.length > 0) {
      setPickerVisible(true);
    }
  };

  const selectContact = async (contact: DeviceContact) => {
    setPickerVisible(false);
    const addr = contact.addresses?.[0];
    const birthdayStr = contactBirthdayString(contact);

    let stablePhotoUri: string | undefined;
    let copyOutcome: "copied" | "fallback_original" | "no_image" = "no_image";
    if (contact.imageUri) {
      try {
        const dest = `${
          FileSystem.cacheDirectory
        }contact-photo-${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: contact.imageUri, to: dest });
        stablePhotoUri = dest;
        copyOutcome = "copied";
      } catch (err) {
        console.error("[photo] copy failed, using original:", err);
        stablePhotoUri = contact.imageUri;
        copyOutcome = "fallback_original";
      }
    }

    Sentry.addBreadcrumb({
      category: "flow",
      message: "contact_picker_select",
      level: "info",
      data: {
        flow: "add_recipient",
        step: "picker_select",
        has_picker_image: contact.imageUri ? "yes" : "no",
        copy_outcome: copyOutcome,
        will_pass_photo_url: stablePhotoUri ? "yes" : "no",
      },
    });

    router.push({
      pathname: "/contacts/add",
      params: {
        name: contact.name,
        ...(birthdayStr && { birthday: birthdayStr }),
        ...(addr?.street && { address: addr.street }),
        ...(addr?.city && { city: addr.city }),
        // Not `state`: react-navigation reserves params.state for a serialized
        // nested navigator state, so a string here crashes StackRouter rehydrate.
        ...(addr?.region && { region: addr.region }),
        ...(addr?.postalCode && { zip_code: addr.postalCode }),
        ...(addr?.country && { country: addr.country }),
        ...(stablePhotoUri && { photo_url: stablePhotoUri }),
      },
    });
  };

  // Multi-select Add: a single contact keeps the conversational intake (the
  // AI chat extracts relationship, interests, etc.), while several selected
  // contacts are created directly from what the address book provides — the
  // profiles get completed later from the recipient screens.
  const addSelectedContacts = async (selected: DeviceContact[]) => {
    if (selected.length === 0) return;
    if (selected.length === 1) {
      await selectContact(selected[0]);
      return;
    }
    if (!user) return;

    setIsAddingContacts(true);
    Sentry.addBreadcrumb({
      category: "flow",
      message: "contact_picker_bulk_add",
      level: "info",
      data: {
        flow: "add_recipient",
        step: "picker_bulk_add",
        count: selected.length,
      },
    });
    try {
      const rows = [];
      for (const contact of selected) {
        // Upload straight from the expo-contacts temp file — it only needs to
        // survive until this loop reads it.
        const photoUrl = contact.imageUri
          ? await uploadRecipientPhoto(contact.imageUri)
          : null;
        const addr = contact.addresses?.[0];
        rows.push({
          user_id: user.id,
          name: contact.name,
          relationship_type: "",
          birthday: contactBirthdayString(contact) ?? null,
          address: addr?.street?.trim() || null,
          city: addr?.city?.trim() || null,
          state: addr?.region?.trim() || null,
          zip_code: addr?.postalCode?.trim() || null,
          country: addr?.country?.trim() || "US",
          photo_url: photoUrl,
        });
      }
      await bulkCreateRecipients.mutateAsync(rows);
      setPickerVisible(false);
    } catch {
      // makeMutationHandlers already surfaced the failure via the global
      // snackbar; keep the picker open so the selection isn't lost.
    } finally {
      setIsAddingContacts(false);
    }
  };

  return {
    contactsLoading,
    pickerVisible,
    accessIntroVisible,
    importFailedVisible,
    isAddingContacts,
    deviceContacts,
    openAccessIntro,
    closeAccessIntro,
    closePicker,
    closeImportFailed,
    continueWithAccess,
    retryImport,
    importFromFile,
    addSelectedContacts,
  };
}
