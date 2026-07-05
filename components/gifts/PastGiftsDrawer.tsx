import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import type { GiftSuggestion } from "../../types/recipient";
import ExpandCircleIcon from "../ExpandCircleIcon";
import PrimaryGiftCard from "./PrimaryGiftCard";
import CollapsedGiftCard from "./CollapsedGiftCard";
import { partitionSuggestions } from "./partition";
import { NAV_CONTENT_HEIGHT } from "../BottomNav";

/** Height of the collapsed drawer's header bar (Figma "Past Gifts collapsed"
 * bar is 56pt). Exported so host screens can pad their scroll content by this
 * much and keep active cards clear of the pinned bar. */
export const COLLAPSED_DRAWER_HEIGHT = 56;

/** Horizontal padding inside gift cards; used to align the header text with the
 * card content (matches CollapsedGiftCard/PrimaryGiftCard content inset). */
const CARD_INNER_PADDING = 23;

type PastGiftsDrawerProps = {
  suggestions: GiftSuggestion[];
  /** When set, only this occasion's suggestions populate the drawer, matching
   * the filtered active list. */
  occasionId?: string | null;
};

/**
 * The "Past Gift Recommendations" drawer, pinned just above the bottom nav.
 * Collapsed it is only the header bar; tapping it grows the drawer *upward*,
 * revealing the past cards in an internally-scrolling area capped at ~half the
 * screen so the header and active cards above stay visible. Rendered as an
 * absolute overlay by the host screen (a sibling of its ScrollView), not inside
 * the scroll flow — that is what keeps the bar fixed while the page scrolls.
 */
const PastGiftsDrawer: React.FC<PastGiftsDrawerProps> = ({
  suggestions,
  occasionId = null,
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  // Accordion local to the drawer: one past card open at a time. Independent of
  // the active list's featured card — the two zones no longer share a card.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { past } = partitionSuggestions(suggestions, occasionId);
  if (past.length === 0) return null;

  // Sit flush on top of the nav: its content row plus the same safe-area inset
  // it pads itself with (BottomNav applies Math.max(insets.bottom, 12)).
  const bottomOffset = NAV_CONTENT_HEIGHT + Math.max(insets.bottom, 12);

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
        chevronColor={Colors.brand.darkTeal}
      />
    );

  return (
    <View style={[styles.root, { bottom: bottomOffset }]}>
      {/* List renders above the header row so the drawer grows upward while the
          header stays pinned at the drawer's bottom edge. */}
      {expanded && (
        <ScrollView
          style={{ maxHeight: windowHeight * 0.5 }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {past.map(renderCard)}
        </ScrollView>
      )}
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
        <ExpandCircleIcon
          direction={expanded ? "up" : "down"}
          color={Colors.brand.mediumTeal}
          size={24}
        />
      </Pressable>
    </View>
  );
};

export default PastGiftsDrawer;

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: Colors.brand.pastZone,
  },
  headerRow: {
    height: COLLAPSED_DRAWER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Align header text/chevron with card content: gutter + card inner padding.
    paddingHorizontal: Spacing.screenGutter + CARD_INNER_PADDING,
  },
  headerText: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
    flex: 1,
  },
  list: {
    // Re-inset past cards to the screen gutter so they line up with active cards.
    paddingHorizontal: Spacing.screenGutter,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
});
