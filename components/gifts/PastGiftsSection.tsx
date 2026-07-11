import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import type { GiftSuggestion } from "../../types/recipient";
import PrimaryGiftCard from "./PrimaryGiftCard";
import CollapsedGiftCard from "./CollapsedGiftCard";
import { partitionSuggestions } from "./partition";

/** Horizontal padding inside gift cards; aligns the band label with the card
 * titles (matches CollapsedGiftCard/PrimaryGiftCard content inset). */
const CARD_INNER_PADDING = 23;

type PastGiftsSectionProps = {
  suggestions: GiftSuggestion[];
  /** When set, only this occasion's suggestions populate the section, matching
   * the filtered active list. */
  occasionId?: string | null;
};

/**
 * The inline "Past Gift Recommendations" section: a full-bleed muted band
 * sitting in the page flow after the active recommendation cards. The past
 * rows render inline (always visible) — the section is a labeled zone, not a
 * collapsible drawer. Each row can still expand into a full product card in
 * place. Hosts render it inside their ScrollView, outside any
 * horizontally-padded container, so the band runs edge to edge.
 */
const PastGiftsSection: React.FC<PastGiftsSectionProps> = ({
  suggestions,
  occasionId = null,
}) => {
  // Accordion local to the section: one past card open at a time. Independent
  // of the active list's featured card — the two zones don't share a card.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { past } = partitionSuggestions(suggestions, occasionId);
  if (past.length === 0) return null;

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
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Past Gift Recommendations</Text>
      </View>
      <View style={styles.list}>{past.map(renderCard)}</View>
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
    justifyContent: "center",
    // Label aligns with the card titles below it.
    paddingLeft: Spacing.screenGutter + CARD_INNER_PADDING,
    paddingRight: Spacing.screenGutter,
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
