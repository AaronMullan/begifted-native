import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Menu, TextInput } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { US_STATES, findUsState } from "../../lib/us-states";

type Props = {
  value: string;
  onSelect: (abbreviation: string) => void;
};

/**
 * Tap-anchored State picker per the v4 Settings design: full state names in
 * the open list, abbreviation in the closed field, plain scrollable list with
 * no search, lightTeal highlight on the selected row.
 */
const StateDropdown: React.FC<Props> = ({ value, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = findUsState(value);

  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchorPosition="bottom"
      contentStyle={styles.menuContent}
      anchor={
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Select state"
        >
          {/* pointerEvents:none so the tap lands on the Pressable, keeping the
              field visually identical to the neighboring inputs. */}
          <View pointerEvents="none">
            <TextInput
              mode="outlined"
              label="State"
              value={selected?.abbreviation ?? value}
              editable={false}
              placeholder="State"
              right={<TextInput.Icon icon={open ? "menu-up" : "menu-down"} />}
            />
          </View>
        </Pressable>
      }
    >
      <ScrollView style={styles.list}>
        {US_STATES.map((state) => {
          const isSelected = state.abbreviation === selected?.abbreviation;
          return (
            <Menu.Item
              key={state.abbreviation}
              title={state.name}
              onPress={() => {
                onSelect(state.abbreviation);
                setOpen(false);
              }}
              style={isSelected ? styles.selectedItem : undefined}
            />
          );
        })}
      </ScrollView>
    </Menu>
  );
};

const styles = StyleSheet.create({
  list: {
    maxHeight: 320,
  },
  menuContent: {
    backgroundColor: Colors.white,
  },
  selectedItem: {
    backgroundColor: Colors.brand.lightTeal,
  },
});

export default StateDropdown;
