import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import type { GiftSuggestion } from "../../types/recipient";
import ExpandCircleIcon from "../ExpandCircleIcon";
import PrimaryGiftCard from "./PrimaryGiftCard";
import CollapsedGiftCard from "./CollapsedGiftCard";
import { partitionSuggestions } from "./partition";

/** Horizontal padding inside gift cards; aligns the band label with the card
 * titles (matches CollapsedGiftCard/PrimaryGiftCard content inset). */
const CARD_INNER_PADDING = 23;

/** Right inset of the circled chevron inside gift cards; the band chevron
 * lines up with the card chevrons, not the card text. */
const CHEVRON_INSET = 13;

type PastGiftsSectionProps = {
  suggestions: GiftSuggestion[];
  /** When set, only this occasion's suggestions populate the section, matching
   * the filtered active list. */
  occasionId?: string | null;
};

/**
 * The inline "Past Gift Recommendations" section (Figma 4306:1620 collapsed,
 * 4170:15730 / 4171:15878 expanded): a full-bleed muted band sitting in the
 * page flow after the active recommendation cards. Collapsed it is just the
 * 56pt header band; tapping it expands the past rows in place, and each row
 * can expand into a full product card inside the band. Hosts render it inside
 * their ScrollView, outside any horizontally-padded container, so the band
 * runs edge to edge.
 */
const PastGiftsSection: React.FC<PastGiftsSectionProps> = ({
  suggestions,
  occasionId = null,
}) => {
  const [expanded, setExpanded] = useState(false);
  // Accordion local to the section: one past card open at a time. Independent
  // of the active list's featured card — the two zones don't share a card.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { past } = partitionSuggestions(suggestions, occasionId);
  if (past.length === 0) return null;

  const toggle = () => {
    if (expanded) setExpandedId(null);
    setExpanded(!expanded);
  };

  const renderCard = (suggestion: GiftSuggestion) =>
    suggestion.id === expandedId ? (
      <PrimaryGiftCard
        key={suggestion.id}
        suggestion={suggestion}
        occasionId={occasionId}
        onCollapse={() => setExpandedId(null)}
      />
    ) : (
      <CollapsedGiftCard
        key={suggestion.id}
        suggestion={suggestion}
        onPress={() => setExpandedId(suggestion.id)}
      />
    );

  return (
    <View style={styles.band}>
      <Pressable
        style={styles.headerRow}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={
          expanded
            ? "Collapse past gift recommendations"
            : "Expand past gift recommendations"
        }
      >
        <Text style={styles.headerText}>Past Gift Recommendations</Text>
        {/* The affordance flips via a distinct up/down glyph, not a rotated icon. */}
        <ExpandCircleIcon
          direction={expanded ? "up" : "down"}
          color={Colors.brand.gold}
          size={24}
        />
      </Pressable>
      {expanded && <View style={styles.list}>{past.map(renderCard)}</View>}
    </View>
  );
};

export default PastGiftsSection;

const styles = StyleSheet.create({
  band: {
    backgroundColor: Colors.brand.pastZone,
  },
  headerRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Label aligns with card titles; chevron aligns with the card chevrons.
    paddingLeft: Spacing.screenGutter + CARD_INNER_PADDING,
    paddingRight: Spacing.screenGutter + CHEVRON_INSET,
  },
  headerText: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
    flex: 1,
  },
  list: {
    // Re-inset past cards to the screen gutter so they line up with the
    // active cards above the band.
    paddingHorizontal: Spacing.screenGutter,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
});
