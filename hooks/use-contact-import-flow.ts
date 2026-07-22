import * as FileSystem from "expo-file-system/legacy";
import * as Sentry from "@sentry/react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { DeviceContact, useDeviceContacts } from "./use-device-contacts";

export function useContactImportFlow() {
  const router = useRouter();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [accessIntroVisible, setAccessIntroVisible] = useState(false);
  const [importFailedVisible, setImportFailedVisible] = useState(false);
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
    setDeviceContacts(contacts);
    if (contacts.length > 0) {
      setPickerVisible(true);
    }
  };

  const selectContact = async (contact: DeviceContact) => {
    setPickerVisible(false);
    const addr = contact.addresses?.[0];

    let birthdayStr: string | undefined;
    if (contact.birthday) {
      const { year, month, day } = contact.birthday;
      const m = String(month).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      // iOS contacts can omit the year. Emit the vCard partial form
      // (--MM-DD) so we don't fudge a current-year birthday and so
      // normalizeBirthday at the save boundary keeps it intact.
      birthdayStr = year ? `${year}-${m}-${d}` : `--${m}-${d}`;
    }

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

  return {
    contactsLoading,
    pickerVisible,
    accessIntroVisible,
    importFailedVisible,
    deviceContacts,
    openAccessIntro,
    closeAccessIntro,
    closePicker,
    closeImportFailed,
    continueWithAccess,
    retryImport,
    importFromFile,
    selectContact,
  };
}
