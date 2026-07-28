import React, { useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import Avatar from "../Avatar";

export type SelectPersonDrawerHandle = {
  present: () => void;
  dismiss: () => void;
};

export type SelectPersonRow = {
  id: string;
  name: string;
  photoUrl?: string | null;
  /** e.g. "Birthday • June 20" — the person's next upcoming moment. */
  subtitle: string | null;
};

type SelectPersonDrawerProps = {
  people: SelectPersonRow[];
  onSelectPerson: (person: SelectPersonRow) => void;
  onAddNewPerson: () => void;
  handleRef: React.MutableRefObject<SelectPersonDrawerHandle | null>;
};

/**
 * "Who's this moment for?" drawer (Figma 4973:5665): Add New Person bar on
 * top, then the existing people as Person List Rows. Replaces the Paper
 * Dialog recipient picker on the Moments screen.
 */
export const SelectPersonDrawer: React.FC<SelectPersonDrawerProps> = ({
  people,
  onSelectPerson,
  onAddNewPerson,
  handleRef,
}) => {
  const sheetRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(handleRef, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["73%"]}
      enableDynamicSizing={false}
      handleIndicatorStyle={styles.sheetHandle}
      backgroundStyle={styles.sheetBackground}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Who&apos;s this moment for?</Text>
        <Text style={styles.subtitle}>
          Pick an existing person, or add someone new.
        </Text>
        <Pressable
          onPress={onAddNewPerson}
          accessibilityRole="button"
          accessibilityLabel="Add a new person"
          style={styles.addNewBar}
        >
          <MaterialIcons name="add" size={16} color={Colors.brand.darkTeal} />
          <Text style={styles.addNewLabel}>Add New Person</Text>
          <MaterialIcons name="chevron-right" size={16} color={Colors.white} />
        </Pressable>
        {people.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>OR CHOOSE SOMEONE</Text>
            <View style={styles.list}>
              {people.map((person) => (
                <Pressable
                  key={person.id}
                  onPress={() => onSelectPerson(person)}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${person.name}`}
                  style={({ pressed }) => [
                    styles.personRow,
                    pressed && styles.personRowPressed,
                  ]}
                >
                  <Avatar
                    name={person.name}
                    size={30}
                    context="list"
                    photoUrl={person.photoUrl}
                  />
                  <View style={styles.personText}>
                    <Text style={styles.personName} numberOfLines={1}>
                      {person.name}
                    </Text>
                    {person.subtitle ? (
                      <View style={styles.personSubtitleRow}>
                        <Text style={styles.personSubtitle} numberOfLines={1}>
                          {person.subtitle}
                        </Text>
                        <MaterialIcons
                          name="chevron-right"
                          size={16}
                          color={Colors.brand.gold}
                        />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

// Frame geometry: text blocks sit on the 32pt drawer inset while bars and
// rows extend to a 20pt gutter.
const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.brand.beigeLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: {
    backgroundColor: Colors.brand.beige,
    width: 58,
    height: 5,
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: Spacing.screenGutter,
    paddingTop: 12,
    paddingBottom: 40,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
    marginHorizontal: Spacing.sectionHeadInset - Spacing.screenGutter,
  },
  subtitle: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
    marginTop: 6,
    marginHorizontal: Spacing.sectionHeadInset - Spacing.screenGutter,
  },
  addNewBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.brand.mediumTeal,
    marginTop: 34,
  },
  addNewLabel: {
    ...Typography.largeCta,
    color: Colors.white,
  },
  sectionLabel: {
    ...Typography.sectionHeadAc,
    color: Colors.brand.mediumTeal,
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: Spacing.sectionHeadInset - Spacing.screenGutter,
  },
  list: {
    gap: 22,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 62,
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingLeft: 7,
    paddingRight: 12,
  },
  personRowPressed: {
    opacity: 0.7,
  },
  personText: {
    flex: 1,
    justifyContent: "center",
  },
  personName: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  personSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  personSubtitle: {
    ...Typography.largeCta,
    color: Colors.brand.gold,
    flexShrink: 1,
  },
});
