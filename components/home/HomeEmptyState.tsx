import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Radii, Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import { BOTTOM_NAV_HEIGHT } from "../../lib/constants";
import ContactPicker from "../ContactPicker";
import ContactsAccessIntro from "../ContactsAccessIntro";
import ContactsImportFailedModal from "../ContactsImportFailedModal";
import GroupAddIcon from "./GroupAddIcon";
import { useContactImportFlow } from "../../hooks/use-contact-import-flow";

/**
 * Dashboard empty state for users with no recipients yet (Figma 4306:1679):
 * Welcome headline, the two add-people CTA cards from the People tab, and a
 * full-bleed photo collage strip pinned above the bottom nav.
 */
export default function HomeEmptyState() {
  const router = useRouter();
  const {
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
    selectContact,
  } = useContactImportFlow();

  const handleImportPress = () => {
    // expo-contacts isn't available on web; the manual flow is the only path
    // there (the People tab hosts the file-import alternative).
    if (Platform.OS === "web") {
      router.push("/contacts/add");
      return;
    }
    openAccessIntro();
  };

  const handleAddManually = () => {
    closeImportFailed();
    router.push("/contacts/add");
  };

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome{"\n"}to BeGifted</Text>
        <Text style={styles.subtitle}>
          Let&apos;s get started by adding your people.
        </Text>
        <View style={styles.ctaGroup}>
          <CtaCard
            solid
            icon={<GroupAddIcon color={Colors.brand.gold} size={30} />}
            label="Import From Contacts"
            subtext="(Easy and reliable)"
            onPress={handleImportPress}
            disabled={contactsLoading}
            accessibilityLabel="Import from contacts"
          />
          <CtaCard
            icon={
              <MaterialIcons name="add" size={24} color={Colors.brand.gold} />
            }
            label="Add People Manually"
            subtext="(You do you)"
            onPress={handleAddManually}
            accessibilityLabel="Add people manually"
          />
        </View>
      </View>
      <View style={styles.collage}>
        <Image
          source={require("../../assets/images/home-empty-photo-left.jpg")}
          style={styles.photoLeft}
          contentFit="cover"
        />
        <View style={styles.stripeRose} />
        <Image
          source={require("../../assets/images/home-empty-photo-middle.jpg")}
          style={styles.photoMiddle}
          contentFit="cover"
        />
        <View style={styles.stripeGold} />
        <Image
          source={require("../../assets/images/home-empty-photo-right.jpg")}
          style={styles.photoRight}
          contentFit="cover"
        />
      </View>
      <View style={styles.navSpacer} />

      <ContactsAccessIntro
        visible={accessIntroVisible}
        onContinue={continueWithAccess}
        onClose={closeAccessIntro}
        isLoading={contactsLoading}
      />
      <ContactPicker
        visible={pickerVisible}
        contacts={deviceContacts}
        onSelect={selectContact}
        onClose={closePicker}
      />
      <ContactsImportFailedModal
        visible={importFailedVisible}
        onRetry={retryImport}
        onAddManuallyPress={handleAddManually}
        onClose={closeImportFailed}
      />
    </View>
  );
}

type CtaCardProps = {
  icon: React.ReactNode;
  label: string;
  subtext: string;
  onPress: () => void;
  accessibilityLabel: string;
  solid?: boolean;
  disabled?: boolean;
};

const CtaCard: React.FC<CtaCardProps> = ({
  icon,
  label,
  subtext,
  onPress,
  accessibilityLabel,
  solid = false,
  disabled = false,
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [
      styles.card,
      solid && styles.cardSolid,
      pressed && styles.cardPressed,
      disabled && styles.cardDisabled,
    ]}
  >
    <View style={styles.cardIcon}>{icon}</View>
    <View>
      <View style={styles.cardLabelRow}>
        <Text style={styles.cardLabel}>{label}</Text>
        <MaterialIcons
          name="chevron-right"
          size={14}
          color={Colors.brand.darkTeal}
        />
      </View>
      <Text style={styles.cardSubtext}>{subtext}</Text>
    </View>
  </Pressable>
);

// Geometry from the 402pt frame: 359x100 cards at the gutter, icon column 29pt
// in with the text column starting 75pt in; collage strip 173pt tall running
// photo/rose stripe/photo/gold stripe/photo at widths 142/35/99/17/109.
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: Spacing.screenGutter,
    paddingTop: 12,
  },
  title: {
    ...Typography.h1,
    color: Colors.brand.darkTeal,
  },
  subtitle: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
    marginTop: 15,
  },
  ctaGroup: {
    marginTop: 50,
    gap: 13,
  },
  card: {
    minHeight: 100,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 29,
    paddingRight: 16,
  },
  cardSolid: {
    backgroundColor: Colors.white,
  },
  cardPressed: {
    opacity: 0.6,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardIcon: {
    width: 46,
    alignItems: "flex-start",
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cardLabel: {
    ...Typography.largeCta,
    color: Colors.brand.darkTeal,
  },
  cardSubtext: {
    ...Typography.smallCta,
    color: Colors.brand.mediumTeal,
    marginTop: 2,
  },
  collage: {
    flexDirection: "row",
    height: 173,
    marginTop: "auto",
  },
  photoLeft: {
    flex: 142,
  },
  stripeRose: {
    flex: 35,
    backgroundColor: Colors.brand.rose,
  },
  photoMiddle: {
    flex: 99,
  },
  stripeGold: {
    flex: 17,
    backgroundColor: Colors.brand.gold,
  },
  photoRight: {
    flex: 109,
  },
  navSpacer: {
    height: BOTTOM_NAV_HEIGHT,
  },
});
