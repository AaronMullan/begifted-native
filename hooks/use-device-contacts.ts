import { useState } from "react";
// SDK 57 turned the main entry's legacy methods (getContactsAsync, etc.) into
// stubs that throw at runtime; the working implementations live under /legacy.
import * as Contacts from "expo-contacts/legacy";
import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
import { contactAnniversary } from "../utils/contact-dates";
import type { ContactDateParts } from "../utils/contact-dates";

export interface DeviceContact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
  birthday?: ContactDateParts;
  anniversary?: ContactDateParts;
  addresses?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }[];
  imageUri?: string;
}

// Case-insensitive name comparator shared by every path that fills the
// contact picker (device fetch and web file import), so the list is
// alphabetical regardless of source.
export function compareContactsByName(a: DeviceContact, b: DeviceContact) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export type DeviceContactsResult = {
  contacts: DeviceContact[];
  limitedAccess: boolean;
};

export function useDeviceContacts() {
  const [loading, setLoading] = useState(false);

  // iOS 18+ lets the user share only selected contacts. That still reports
  // status "granted", but getContactsAsync then returns just those few, so
  // callers need to know to offer the system's contact-access picker.
  async function requestPermission(): Promise<{
    granted: boolean;
    limited: boolean;
  }> {
    if (Platform.OS === "web") {
      return { granted: false, limited: false };
    }

    const { status, accessPrivileges } =
      await Contacts.requestPermissionsAsync();
    const granted = status === "granted";
    return { granted, limited: granted && accessPrivileges === "limited" };
  }

  const baseFields = [
    Contacts.Fields.Name,
    Contacts.Fields.PhoneNumbers,
    Contacts.Fields.Emails,
    Contacts.Fields.Birthday,
    Contacts.Fields.Dates,
    Contacts.Fields.Addresses,
  ];

  // Requesting Image/RawImage makes expo-contacts write every contact's photo
  // to the cache during serialization; a single unwritable image rejects the
  // whole getContactsAsync call. Retry without image fields so one bad photo
  // can't kill the entire import — contacts just come through photo-less.
  async function fetchContacts() {
    try {
      return await Contacts.getContactsAsync({
        fields: [
          ...baseFields,
          Contacts.Fields.Image,
          Contacts.Fields.RawImage,
        ],
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { flow: "contact_import", stage: "fetch_with_images" },
      });
      return await Contacts.getContactsAsync({ fields: baseFields });
    }
  }

  // Resolves to the imported contacts, or null when the import failed
  // (permission denied or an expo-contacts error) so callers can offer a
  // retry / add-manually fallback.
  async function getDeviceContacts(): Promise<DeviceContactsResult | null> {
    setLoading(true);

    let hasPermission = false;
    let limitedAccess = false;
    try {
      const permission = await requestPermission();
      hasPermission = permission.granted;
      limitedAccess = permission.limited;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { flow: "contact_import", stage: "permission_request" },
      });
      setLoading(false);
      return null;
    }
    if (!hasPermission) {
      setLoading(false);
      return null;
    }

    try {
      const { data } = await fetchContacts();

      // iOS sometimes omits the thumbnail (`image.uri`) for iCloud-synced or
      // large-photo contacts even when the picture exists. Fall back to the
      // full-resolution `rawImage.uri` so those contacts still get a URI.
      const normalizeContactImageUri = (uri?: string) => {
        if (!uri) return undefined;
        return uri.startsWith("/") ? `file://${uri}` : uri;
      };

      const filteredContacts = data
        .filter((contact) => contact.name)
        .map((contact) => ({
          id: contact.id,
          name: contact.name || "Unknown",
          phoneNumbers: contact.phoneNumbers
            ?.map((p) => p.number)
            .filter((n): n is string => !!n),
          emails: contact.emails
            ?.map((e) => e.email)
            .filter((e): e is string => !!e),
          birthday: contact.birthday
            ? {
                // expo-contacts serializes months 0-indexed (its native layer
                // emits `month - 1`); convert here so everything downstream
                // works in calendar months. `??` — not `||` — so January (0)
                // isn't mistaken for a missing month.
                month: (contact.birthday.month ?? 0) + 1,
                day: contact.birthday.day || 1,
                year: contact.birthday.year,
              }
            : undefined,
          anniversary: contactAnniversary(contact.dates),
          addresses: contact.addresses?.map((addr) => ({
            street: addr.street,
            city: addr.city,
            region: addr.region,
            postalCode: addr.postalCode,
            country: addr.country,
          })),
          imageUri: contact.imageAvailable
            ? (normalizeContactImageUri(contact.image?.uri) ??
              normalizeContactImageUri(contact.rawImage?.uri))
            : undefined,
        }));
      // The OS returns contacts in unspecified order; sort here (not via the
      // getContactsAsync sort option) so both fetch paths and all platforms
      // agree, and the picker lists names alphabetically.
      filteredContacts.sort(compareContactsByName);
      return { contacts: filteredContacts, limitedAccess };
    } catch (error) {
      console.error("Error fetching contacts:", error);
      Sentry.captureException(error, {
        tags: { flow: "contact_import", stage: "fetch_without_images" },
      });
      return null;
    } finally {
      setLoading(false);
    }
  }

  // Opens iOS's picker for sharing additional contacts, then reloads the
  // list. Resolves like getDeviceContacts.
  async function chooseMoreContacts(): Promise<DeviceContactsResult | null> {
    try {
      await Contacts.presentAccessPickerAsync();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { flow: "contact_import", stage: "access_picker" },
      });
    }
    return getDeviceContacts();
  }

  return {
    loading,
    getDeviceContacts,
    chooseMoreContacts,
  };
}
