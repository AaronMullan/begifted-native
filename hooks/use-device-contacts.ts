import { useState } from "react";
import * as Contacts from "expo-contacts";
import * as Linking from "expo-linking";
import * as Sentry from "@sentry/react-native";
import { Alert, Platform } from "react-native";

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

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please enable contacts access in your device settings to import contacts.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    return true;
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

  async function getDeviceContacts(): Promise<DeviceContact[]> {
    setLoading(true);

    let hasPermission = false;
    try {
      hasPermission = await requestPermission();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { flow: "contact_import", stage: "permission_request" },
      });
      setLoading(false);
      Alert.alert(
        "Contacts Access Failed",
        "We couldn't request access to your contacts. Please check contacts permission for BeGifted in your device settings and try again."
      );
      return [];
    }
    if (!hasPermission) {
      setLoading(false);
      return [];
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
      const detail = error instanceof Error ? ` (${error.message})` : "";
      Alert.alert(
        "Couldn't Load Contacts",
        `Something went wrong reading contacts from your device${detail}. You can also add people manually.`
      );
      return [];
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    getDeviceContacts,
  };
}
