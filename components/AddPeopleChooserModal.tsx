import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { Colors } from "../lib/colors";
import { Radii, Typography } from "../lib/typography";
import GroupAddIcon from "./home/GroupAddIcon";

type AddPeopleChooserModalProps = {
  visible: boolean;
  onClose: () => void;
  onImportPress: () => void;
  onAddManuallyPress: () => void;
  importDisabled?: boolean;
};

// Figma "Add More People — Modal v2" (4836:5550). Plain RN Modal for exact
// centering (the documented Paper Dialog exception).
const AddPeopleChooserModal: React.FC<AddPeopleChooserModalProps> = ({
  visible,
  onClose,
  onImportPress,
  onAddManuallyPress,
  importDisabled = false,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.card} onPress={() => {}}>
        <Text style={styles.title}>Add More People</Text>
        <OptionCard
          label="Import From Contacts >"
          tagline="(Easy and reliable)"
          icon={<PlusGlyph />}
          filled
          onPress={onImportPress}
          disabled={importDisabled}
          accessibilityLabel="Import from contacts"
        />
        <OptionCard
          label="Add People Manually >"
          tagline="(You do you)"
          icon={<GroupAddIcon color={Colors.brand.gold} size={32} />}
          onPress={onAddManuallyPress}
          accessibilityLabel="Add people manually"
        />
        <Button
          mode="text"
          onPress={onClose}
          textColor={Colors.brand.mediumTeal}
          labelStyle={styles.cancelLabel}
        >
          Cancel
        </Button>
      </Pressable>
    </Pressable>
  </Modal>
);

export default AddPeopleChooserModal;

type OptionCardProps = {
  label: string;
  tagline: string;
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  filled?: boolean;
  disabled?: boolean;
};

const OptionCard: React.FC<OptionCardProps> = ({
  label,
  tagline,
  icon,
  onPress,
  accessibilityLabel,
  filled = false,
  disabled = false,
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [
      styles.option,
      filled && styles.optionFilled,
      pressed && styles.optionPressed,
      disabled && styles.optionDisabled,
    ]}
  >
    {icon}
    <Text style={styles.optionLabel}>{label}</Text>
    <Text style={styles.optionTagline}>{tagline}</Text>
  </Pressable>
);

// The modal's 32px plus is drawn from two bars in Figma; MaterialIcons "add"
// renders a thinner stroke at this size, so mirror the bar construction.
const PlusGlyph: React.FC = () => (
  <View style={styles.plusBox}>
    <View style={styles.plusBarH} />
    <View style={styles.plusBarV} />
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 320,
    borderRadius: 16,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    gap: 16,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  option: {
    height: 116,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Colors.brand.beige,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  optionFilled: {
    backgroundColor: Colors.white,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLabel: {
    ...Typography.largeCta,
    color: Colors.brand.darkTeal,
    marginTop: 8,
  },
  optionTagline: {
    ...Typography.smallCta,
    color: Colors.brand.mediumTeal,
    marginTop: 4,
  },
  cancelLabel: {
    ...Typography.largeCta,
  },
  plusBox: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  plusBarH: {
    position: "absolute",
    width: 32,
    height: 3.2,
    backgroundColor: Colors.brand.gold,
  },
  plusBarV: {
    position: "absolute",
    width: 3.2,
    height: 32,
    backgroundColor: Colors.brand.gold,
  },
});
