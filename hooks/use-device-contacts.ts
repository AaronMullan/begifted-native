import { useState } from "react";
import * as Contacts from "expo-contacts";
import { Alert, Platform } from "react-native";

export interface DeviceContact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
  birthday?: { month: number; day: number; year?: number };
  addresses?: Array<{
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }>;
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
        "Please enable contacts access in your device settings to import contacts."
      );
      return false;
    }

    return true;
  }

  async function getDeviceContacts(): Promise<DeviceContact[]> {
    try {
      setLoading(true);

      const hasPermission = await requestPermission();
      if (!hasPermission) return [];

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Birthday,
          Contacts.Fields.Addresses,
        ],
      });

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
        }));
      return filteredContacts;
    } catch (error) {
      console.error("Error fetching contacts:", error);
      Alert.alert("Error", "Failed to load contacts from your device.");
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
