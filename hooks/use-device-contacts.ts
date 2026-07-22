import { useState } from "react";
import * as Contacts from "expo-contacts";
import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";

export interface DeviceContact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
  birthday?: { month: number; day: number; year?: number };
  addresses?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }[];
  imageUri?: string;
}

export function useDeviceContacts() {
  const [loading, setLoading] = useState(false);

  async function requestPermission(): Promise<boolean> {
    if (Platform.OS === "web") {
      return false;
    }

    const { status } = await Contacts.requestPermissionsAsync();
    return status === "granted";
  }

  const baseFields = [
    Contacts.Fields.Name,
    Contacts.Fields.PhoneNumbers,
    Contacts.Fields.Emails,
    Contacts.Fields.Birthday,
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
  async function getDeviceContacts(): Promise<DeviceContact[] | null> {
    setLoading(true);

    let hasPermission = false;
    try {
      hasPermission = await requestPermission();
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
                month: contact.birthday.month || 1,
                day: contact.birthday.day || 1,
                year: contact.birthday.year,
              }
            : undefined,
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
      return filteredContacts;
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

  return {
    loading,
    getDeviceContacts,
  };
}
