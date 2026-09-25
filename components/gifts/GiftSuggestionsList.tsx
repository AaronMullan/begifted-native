import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";
import type { GiftSuggestion } from "../../types/recipient";
import PrimaryGiftCard from "./PrimaryGiftCard";
import CollapsedGiftCard from "./CollapsedGiftCard";
import GiftGenerationWaiting from "./GiftGenerationWaiting";
import PendingGiftCard from "./PendingGiftCard";
import { partitionSuggestions } from "./partition";
import type { GiftIdeasEmptyState } from "./gift-ideas-state";
import StateMessage from "../StateMessage";
import { StateCopy } from "../../lib/state-copy";
import {
  formatOccasionType,
  formatOccasionTypeLower,
  possessive,
  stripRecipientName,
} from "../../utils/home-occasions";

type GiftSuggestionsListProps = {
  suggestions: GiftSuggestion[];
  /** Recipient first name, used in the empty state copy. */
  recipientName: string;
  loading?: boolean;
  /** Shows the in-progress banner above cards already on screen. */
  isGenerating?: boolean;
  /** What an empty list says; see `giftIdeasEmptyState`. */
  emptyState: GiftIdeasEmptyState;
  /** occasion_type of the occasion behind `emptyState`, for the not-due copy. */
  stateOccasionType?: string | null;
  /** Set only when the suggestions fetch itself failed. */
  onRetryLoad?: () => void;
  /** When set, only suggestions for this occasion are shown, and gift
   * feedback is attributed to it. */
  occasionId?: string | null;
  /** Clears the occasion filter to reveal every suggestion. */
  onClearOccasionFilter?: () => void;
  /** Scrolls a freshly-expanded card's root node to a predictable spot below
   * the header. Wired up by the host screen that owns the ScrollView (DEV-185). */
  onScrollCardIntoView?: (node: View | null) => void;
};

const GiftSuggestionsList: React.FC<GiftSuggestionsListProps> = ({
  suggestions,
  recipientName,
  loading = false,
  isGenerating = false,
  emptyState,
  stateOccasionType = null,
  onRetryLoad,
  occasionId = null,
  onClearOccasionFilter,
  onScrollCardIntoView,
}) => {
  // `undefined` = default (feature the newest active suggestion); `null` = user
  // collapsed everything; a string = a specific featured suggestion. A single
  // accordion state spans both the active and Past Gifts cards: only one card is
  // open at a time and it expands in place — never reordered to the top.
  const [expandedId, setExpandedId] = useState<string | null | undefined>(
    undefined
  );

  // True only between a user tapping a card and that card reporting its layout,
  // so we scroll on explicit taps but never on the default initial expansion.
  const scrollOnNextExpand = useRef(false);

  const handleExpand = (id: string) => {
    scrollOnNextExpand.current = true;
    setExpandedId(id);
  };
  const handleCollapse = () => setExpandedId(null);

  const handleExpandLayout = (node: View | null) => {
    if (!scrollOnNextExpand.current) return;
    scrollOnNextExpand.current = false;
    onScrollCardIntoView?.(node);
  };

  // The active recommendation cards; the "Past Gifts" remainder is rendered
  // separately by PastGiftsSection, placed after this list by the host.
  const {
    visible: visibleSuggestions,
    active: activeSuggestions,
    pendingSlots,
  } = partitionSuggestions(suggestions, occasionId);

  // If the currently open gift was just removed (or filtered out of view), the
  // stale `expandedId` would match no card and collapse the page to a list-only
  // dead state. Fall back to the first active recommendation so one gift always
  // stays open in display mode while valid recommendations remain (DEV-167). An
  // explicit user collapse (`null`) is still respected.
  const expandedStillVisible =
    typeof expandedId === "string" &&
    visibleSuggestions.some((s) => s.id === expandedId);

  const activeId =
    expandedId === null
      ? null
      : expandedStillVisible
        ? expandedId
        : (activeSuggestions[0]?.id ?? null);

  const thing = recipientName
    ? `${possessive(recipientName)} gift ideas`
    : "these gift ideas";

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StateMessage loading message={StateCopy.inProgress(thing)} />
      </View>
    );
  }

  // The user always reaches a filtered list from a control that already named
  // the occasion (notification tap, occasion card), so the filter surfaces only
  // the affordance to clear it — a repeated title reads as tappable but isn't.
  const occasionHeader =
    occasionId && onClearOccasionFilter ? (
      <View style={styles.occasionHeader}>
        <Pressable onPress={onClearOccasionFilter} hitSlop={6}>
          <Text style={styles.viewAllLink}>View all gifts ›</Text>
        </Pressable>
      </View>
    ) : null;

  const renderEmptyState = () => {
    const name = recipientName || "them";
    switch (emptyState) {
      case "generating":
        return <GiftGenerationWaiting recipientName={recipientName} />;
      case "failed":
        return onRetryLoad ? (
          <View style={styles.stateTop}>
            <StateMessage
              message={StateCopy.loadFailed(thing)}
              onRetry={onRetryLoad}
            />
          </View>
        ) : (
          <StateMessage size="hero" message={StateCopy.loadFailed(thing)} />
        );
      case "no_results":
        return (
          <StateMessage
            size="hero"
            message={StateCopy.giftIdeasNoResults(name)}
          />
        );
      case "not_due":
        return (
          <StateMessage
            size="hero"
            message={StateCopy.giftIdeasNotDue(
              name,
              occasionPhrase(stateOccasionType, recipientName)
            )}
          />
        );
      case "empty":
        return (
          <StateMessage size="hero" message={StateCopy.empty("gift ideas")} />
        );
    }
  };

  if (visibleSuggestions.length === 0) {
    return (
      <View>
        {occasionHeader}
        {renderEmptyState()}
      </View>
    );
  }

  const renderCard = (suggestion: GiftSuggestion) =>
    suggestion.id === activeId ? (
      <PrimaryGiftCard
        key={suggestion.id}
        suggestion={suggestion}
        occasionId={occasionId}
        onCollapse={handleCollapse}
        onExpandLayout={handleExpandLayout}
      />
    ) : (
      <CollapsedGiftCard
        key={suggestion.id}
        suggestion={suggestion}
        onPress={() => handleExpand(suggestion.id)}
      />
    );

  return (
    <View>
      {occasionHeader}
      {isGenerating && (
        <View style={styles.generatingContainer}>
          <ActivityIndicator size="small" />
          <Text variant="bodyMedium" style={styles.generatingText}>
            {StateCopy.inProgress("new gift ideas")}
          </Text>
        </View>
      )}

      <View style={styles.list}>
        {activeSuggestions.map((s) => renderCard(s))}
        {/* Holds each slot a removal emptied so no past row slides up into it
            while the replacement generates (DEV-488). */}
        {Array.from({ length: pendingSlots }, (_, i) => (
          <PendingGiftCard key={`pending-${i}`} />
        ))}
      </View>
    </View>
  );
};

export default GiftSuggestionsList;

/** "Mike's birthday", "Christmas"; "the day" when the occasion is unknown. */
function occasionPhrase(occasionType: string | null, name: string): string {
  if (!occasionType) return "the day";
  const type = stripRecipientName(occasionType, name);
  const personal = /birthday|anniversary/i.test(type);
  if (personal) {
    return name
      ? `${possessive(name)} ${formatOccasionTypeLower(type)}`
      : `their ${formatOccasionTypeLower(type)}`;
  }
  return formatOccasionType(type);
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  generatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 18,
    marginBottom: 16,
  },
  generatingText: {
    marginLeft: 12,
    color: "#666",
  },
  occasionHeader: {
    alignItems: "flex-end",
    marginBottom: 16,
  },
  viewAllLink: {
    ...Typography.largeCta,
    color: Colors.yellows.amber,
  },
  stateTop: {
    // Lines the message up with the hero StateMessage's 104pt top, net of
    // the inline variant's own vertical padding.
    paddingTop: 104 - Spacing.marginStandard,
  },
});
