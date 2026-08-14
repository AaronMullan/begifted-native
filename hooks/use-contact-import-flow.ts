import * as FileSystem from "expo-file-system/legacy";
import * as Sentry from "@sentry/react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { setPendingContactQueue } from "../lib/pending-contact-queue";
import type { PendingContactSeed } from "../lib/pending-contact-queue";
import {
  compareContactsByName,
  DeviceContact,
  useDeviceContacts,
} from "./use-device-contacts";

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

// expo-contacts photo URIs are temp files iOS cleans up quickly; copy each to
// a stable cache path so it survives until the recipient is saved.
async function cacheContactPhoto(contact: DeviceContact): Promise<{
  uri?: string;
  outcome: "copied" | "fallback_original" | "no_image";
}> {
  if (!contact.imageUri) return { outcome: "no_image" };
  try {
    // Random suffix: a batch can cache several photos in the same millisecond.
    const dest = `${FileSystem.cacheDirectory}contact-photo-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.jpg`;
    await FileSystem.copyAsync({ from: contact.imageUri, to: dest });
    return { uri: dest, outcome: "copied" };
  } catch (err) {
    console.error("[photo] copy failed, using original:", err);
    return { uri: contact.imageUri, outcome: "fallback_original" };
  }
}

function buildContactSeed(
  contact: DeviceContact,
  photoUri?: string
): PendingContactSeed {
  const addr = contact.addresses?.[0];
  return {
    name: contact.name,
    birthday: contactBirthdayString(contact),
    photoUri,
    address: {
      ...(addr?.street && { address: addr.street }),
      ...(addr?.city && { city: addr.city }),
      ...(addr?.region && { state: addr.region }),
      ...(addr?.postalCode && { zip_code: addr.postalCode }),
      ...(addr?.country && { country: addr.country }),
    },
  };
}

export function useContactImportFlow() {
  const router = useRouter();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [accessIntroVisible, setAccessIntroVisible] = useState(false);
  const [importFailedVisible, setImportFailedVisible] = useState(false);
  const [isAddingContacts, setIsAddingContacts] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const { loading: contactsLoading, getDeviceContacts } = useDeviceContacts();

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

    const { uri: stablePhotoUri, outcome: copyOutcome } =
      await cacheContactPhoto(contact);

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

  // Multi-select Add: every selected contact goes through the same
  // conversational intake as a single selection — queued one person at a
  // time — so no recipient is ever created without the full setup flow.
  const addSelectedContacts = async (selected: DeviceContact[]) => {
    if (selected.length === 0) return;
    if (selected.length === 1) {
      await selectContact(selected[0]);
      return;
    }

    setIsAddingContacts(true);
    Sentry.addBreadcrumb({
      category: "flow",
      message: "contact_picker_queue_add",
      level: "info",
      data: {
        flow: "add_recipient",
        step: "picker_queue_add",
        count: selected.length,
      },
    });
    try {
      const seeds: PendingContactSeed[] = [];
      for (const contact of selected) {
        const { uri } = await cacheContactPhoto(contact);
        seeds.push(buildContactSeed(contact, uri));
      }
      setPendingContactQueue(seeds);
      setPickerVisible(false);
      router.push("/contacts/add");
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
