import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { DeviceContact } from "../hooks/use-device-contacts";

interface Props {
  onImport: (contacts: DeviceContact[]) => void;
}

export default function ContactFileImport({ onImport }: Props) {
  const [loading, setLoading] = useState(false);
  const [hasContactPicker, setHasContactPicker] = useState(false);

  // Check if browser supports Contact Picker API
  useEffect(() => {
    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      setHasContactPicker("contacts" in navigator);
    }
  }, []);

  if (Platform.OS !== "web") return null;

  const handleContactPicker = async () => {
    try {
      setLoading(true);
      // @ts-ignore - Contact Picker API types not in all browsers
      const props = ["name", "email", "tel", "address"];
      const opts = { multiple: true };

      // @ts-ignore
      const selectedContacts = await navigator.contacts.select(props, opts);

      const contacts: DeviceContact[] = selectedContacts.map(
        (contact: any) => ({
          id: Math.random().toString(),
          name: contact.name?.[0] || "Unknown",
          emails: contact.email,
          phoneNumbers: contact.tel,
          addresses: contact.address?.map((addr: any) => ({
            street: addr.addressLine?.[0],
            city: addr.city,
            region: addr.region,
            postalCode: addr.postalCode,
            country: addr.country,
          })),
        })
      );

      if (contacts.length > 0) {
        onImport(contacts);
      } else {
        alert("No contacts selected");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error accessing contacts:", error);
        alert("Unable to access contacts. Please use file upload instead.");
      }
      // AbortError means user cancelled - do nothing
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();

      let contacts: DeviceContact[] = [];

      if (file.name.endsWith(".vcf")) {
        contacts = parseVCard(text);
      } else if (file.name.endsWith(".csv")) {
        contacts = parseCSV(text);
      }

      if (contacts.length === 0) {
        alert("No contacts found in file. Please check the format.");
      } else {
        onImport(contacts);
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      alert("Error reading file. Please try again.");
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  return (
    <View style={styles.container}>
      {hasContactPicker && (
        <>
          <TouchableOpacity
            style={styles.button}
            onPress={handleContactPicker}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Loading..." : "👥 Pick from Browser Contacts"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.divider}>OR</Text>
        </>
      )}

      <input
        type="file"
        accept=".vcf,.csv"
        onChange={handleFileUpload}
        style={{ display: "none" }}
        id="contact-file-input"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          if (typeof document !== "undefined") {
            document.getElementById("contact-file-input")?.click();
          }
        }}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Loading..." : "📁 Upload Contacts File (.vcf or .csv)"}
        </Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        Export contacts from Gmail, Outlook, or your phone and upload here
      </Text>
    </View>
  );
}

function parseVCard(text: string): DeviceContact[] {
  const contacts: DeviceContact[] = [];
  const cards = text.split("BEGIN:VCARD");

  for (const card of cards) {
    if (!card.trim()) continue;

    const nameMatch = card.match(/FN:(.*)/);
    const emailMatch = card.match(/EMAIL[^:]*:(.*)/);
    const telMatch = card.match(/TEL[^:]*:(.*)/);
    const bdayMatch = card.match(/BDAY:(.*)/);
    const adrMatch = card.match(
      /ADR[^:]*:([^;]*);([^;]*);([^;]*);([^;]*);([^;]*);([^;]*);([^;]*)/
    );

    const name = nameMatch?.[1]?.trim();
    if (!name) continue;

    const contact: DeviceContact = {
      id: Math.random().toString(),
      name,
      emails: emailMatch ? [emailMatch[1].trim()] : undefined,
      phoneNumbers: telMatch ? [telMatch[1].trim()] : undefined,
    };

    if (bdayMatch) {
      const bday = bdayMatch[1].trim();
      // Parse YYYYMMDD or YYYY-MM-DD
      const year = parseInt(bday.substring(0, 4));
      const month = parseInt(bday.substring(4, 6) || bday.substring(5, 7));
      const day = parseInt(bday.substring(6, 8) || bday.substring(8, 10));

      if (!isNaN(month) && !isNaN(day)) {
        contact.birthday = { month, day, year: isNaN(year) ? undefined : year };
      }
    }

    if (adrMatch) {
      contact.addresses = [
        {
          street: adrMatch[3]?.trim(),
          city: adrMatch[4]?.trim(),
          region: adrMatch[5]?.trim(),
          postalCode: adrMatch[6]?.trim(),
          country: adrMatch[7]?.trim(),
        },
      ];
    }

    contacts.push(contact);
  }

  return contacts;
}

function parseCSV(text: string): DeviceContact[] {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const contacts: DeviceContact[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const contact: any = {
      id: Math.random().toString(),
      name: "",
    };

    headers.forEach((header, index) => {
      const value = values[index]?.trim().replace(/^"|"$/g, ""); // Remove quotes
      if (!value) return;

      if (
        header.includes("name") ||
        header.includes("first") ||
        header.includes("last")
      ) {
        contact.name = contact.name ? `${contact.name} ${value}` : value;
      } else if (header.includes("email")) {
        contact.emails = contact.emails || [];
        contact.emails.push(value);
      } else if (header.includes("phone") || header.includes("tel")) {
        contact.phoneNumbers = contact.phoneNumbers || [];
        contact.phoneNumbers.push(value);
      } else if (header.includes("birthday") || header.includes("birth")) {
        // Try to parse birthday
        const dateMatch = value.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
        if (dateMatch) {
          contact.birthday = {
            month: parseInt(dateMatch[1]),
            day: parseInt(dateMatch[2]),
            year: dateMatch[3] ? parseInt(dateMatch[3]) : undefined,
          };
        }
      } else if (header.includes("address") || header.includes("street")) {
        contact.addresses = contact.addresses || [{}];
        contact.addresses[0].street = value;
      } else if (header.includes("city")) {
        contact.addresses = contact.addresses || [{}];
        contact.addresses[0].city = value;
      } else if (header.includes("state") || header.includes("region")) {
        contact.addresses = contact.addresses || [{}];
        contact.addresses[0].region = value;
      } else if (header.includes("zip") || header.includes("postal")) {
        contact.addresses = contact.addresses || [{}];
        contact.addresses[0].postalCode = value;
      } else if (header.includes("country")) {
        contact.addresses = contact.addresses || [{}];
        contact.addresses[0].country = value;
      }
    });

    if (contact.name) contacts.push(contact);
  }

  return contacts;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#34C759",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginVertical: 12,
    fontWeight: "600",
  },
  hint: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
});
