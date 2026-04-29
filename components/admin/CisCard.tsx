import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  Text,
  Button,
  TextInput,
  Card,
  ActivityIndicator,
  IconButton,
  Chip,
  Divider,
  Badge,
} from "react-native-paper";
import type { CISPreview } from "@/hooks/use-prompt-playground";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type CisCardProps = {
  isLoadingCis: boolean;
  hasCisEdits: boolean;
  editedCis: CISPreview | null;
  cisEdits: DeepPartial<CISPreview>;
  resetCisEdits: () => void;
  setCisField: <S extends keyof CISPreview>(
    section: S,
    field: keyof CISPreview[S],
    value: CISPreview[S][keyof CISPreview[S]]
  ) => void;
};

export const CisCard: React.FC<CisCardProps> = ({
  isLoadingCis,
  hasCisEdits,
  editedCis: cis,
  cisEdits,
  resetCisEdits,
  setCisField,
}) => {
  const [showCisPanel, setShowCisPanel] = useState(true);
  const [addingInterest, setAddingInterest] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [addingAvoid, setAddingAvoid] = useState(false);
  const [newAvoid, setNewAvoid] = useState("");

  function sectionHasEdits(section: string) {
    return !!(cisEdits as Record<string, unknown>)[section];
  }

  function handleRemoveInterest(index: number) {
    const current = cis?.recipient.interests || [];
    const updated = current.filter((_, i) => i !== index);
    setCisField("recipient", "interests", updated as CISPreview["recipient"]["interests"]);
  }

  function handleAddInterest() {
    const val = newInterest.trim();
    if (!val) return;
    const current = cis?.recipient.interests || [];
    setCisField("recipient", "interests", [...current, val] as CISPreview["recipient"]["interests"]);
    setNewInterest("");
    setAddingInterest(false);
  }

  function handleRemoveAvoid(index: number) {
    const current = cis?.history.avoid || [];
    const updated = current.filter((_, i) => i !== index);
    setCisField("history", "avoid", updated as CISPreview["history"]["avoid"]);
  }

  function handleAddAvoid() {
    const val = newAvoid.trim();
    if (!val) return;
    const current = cis?.history.avoid || [];
    setCisField("history", "avoid", [...current, val] as CISPreview["history"]["avoid"]);
    setNewAvoid("");
    setAddingAvoid(false);
  }

  function handleRemovePriorGift(index: number) {
    const current = cis?.history.prior_gifts || [];
    const updated = current.filter((_, i) => i !== index);
    setCisField("history", "prior_gifts", updated as CISPreview["history"]["prior_gifts"]);
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardTitleRow}>
          <View style={styles.cisTitleGroup}>
            <Text variant="titleSmall" style={styles.cardTitle}>
              CIS Data
            </Text>
            {hasCisEdits && (
              <Badge size={8} style={styles.editedBadgeTitle} />
            )}
          </View>
          <View style={styles.cisHeaderActions}>
            {hasCisEdits && (
              <Button
                mode="text"
                onPress={resetCisEdits}
                compact
                icon="refresh"
              >
                Reset
              </Button>
            )}
            <IconButton
              icon={showCisPanel ? "chevron-up" : "chevron-down"}
              size={18}
              onPress={() => setShowCisPanel(!showCisPanel)}
              style={styles.collapseIcon}
            />
          </View>
        </View>
        {showCisPanel && (
          <>
            {isLoadingCis ? (
              <ActivityIndicator size="small" style={styles.cisLoading} />
            ) : cis ? (
              <View style={styles.cisSections}>
                {/* Giver section */}
                <EditableCISSection label="Giver" hasEdits={sectionHasEdits("giver")}>
                  <TextInput
                    mode="outlined"
                    label="Name"
                    value={cis.giver.name}
                    onChangeText={(v) => setCisField("giver", "name", v)}
                    dense
                    style={styles.cisInput}
                    outlineStyle={styles.cisInputOutline}
                  />
                  <TextInput
                    mode="outlined"
                    label="Gifting Summary"
                    value={cis.giver.gifting_summary ?? ""}
                    onChangeText={(v) => setCisField("giver", "gifting_summary", v)}
                    dense
                    style={styles.cisInput}
                    outlineStyle={styles.cisInputOutline}
                    multiline
                  />
                  {cis.giver.synthesized_profile ? (
                    <View style={styles.synthesizedProfileBox}>
                      <Text variant="labelSmall" style={styles.cisFieldLabel}>
                        Synthesized Profile
                      </Text>
                      <Text variant="bodySmall" style={styles.synthesizedProfileText}>
                        {cis.giver.synthesized_profile}
                      </Text>
                    </View>
                  ) : null}
                </EditableCISSection>

                <Divider style={styles.cisDivider} />

                {/* Recipient section */}
                <EditableCISSection label="Recipient" hasEdits={sectionHasEdits("recipient")}>
                  <TextInput
                    mode="outlined"
                    label="Name"
                    value={cis.recipient.name}
                    onChangeText={(v) => setCisField("recipient", "name", v)}
                    dense
                    style={styles.cisInput}
                    outlineStyle={styles.cisInputOutline}
                  />
                  <View style={styles.cisInputRow}>
                    <TextInput
                      mode="outlined"
                      label="Relationship"
                      value={cis.recipient.relationship}
                      onChangeText={(v) => setCisField("recipient", "relationship", v)}
                      dense
                      style={[styles.cisInput, styles.cisInputFlex]}
                      outlineStyle={styles.cisInputOutline}
                    />
                    <TextInput
                      mode="outlined"
                      label="Age"
                      value={cis.recipient.age != null ? String(cis.recipient.age) : ""}
                      onChangeText={(v) => setCisField("recipient", "age", v ? Number(v) : undefined)}
                      dense
                      keyboardType="numeric"
                      style={[styles.cisInput, { width: 70 }]}
                      outlineStyle={styles.cisInputOutline}
                    />
                  </View>
                  <TextInput
                    mode="outlined"
                    label="Location"
                    value={cis.recipient.location || ""}
                    onChangeText={(v) => setCisField("recipient", "location", v || undefined)}
                    dense
                    style={styles.cisInput}
                    outlineStyle={styles.cisInputOutline}
                  />
                  {cis.recipient.synthesized_profile ? (
                    <View style={styles.synthesizedProfileBox}>
                      <Text variant="labelSmall" style={styles.cisFieldLabel}>
                        Synthesized Profile
                      </Text>
                      <Text variant="bodySmall" style={styles.synthesizedProfileText}>
                        {cis.recipient.synthesized_profile}
                      </Text>
                    </View>
                  ) : null}
                  <Text variant="labelSmall" style={styles.cisFieldLabel}>
                    Interests
                  </Text>
                  <View style={styles.cisChipRow}>
                    {(cis.recipient.interests || []).map((interest, i) => (
                      <Chip
                        key={i}
                        compact
                        style={styles.cisInterestChip}
                        onClose={() => handleRemoveInterest(i)}
                      >
                        {interest}
                      </Chip>
                    ))}
                    {addingInterest ? (
                      <View style={styles.inlineAddRow}>
                        <TextInput
                          mode="outlined"
                          value={newInterest}
                          onChangeText={setNewInterest}
                          onSubmitEditing={handleAddInterest}
                          placeholder="Add..."
                          dense
                          style={styles.inlineAddInput}
                          outlineStyle={styles.cisInputOutline}
                          autoFocus
                        />
                        <IconButton icon="check" size={16} onPress={handleAddInterest} />
                        <IconButton icon="close" size={16} onPress={() => { setAddingInterest(false); setNewInterest(""); }} />
                      </View>
                    ) : (
                      <Chip
                        compact
                        icon="plus"
                        style={styles.addChip}
                        onPress={() => setAddingInterest(true)}
                      >
                        Add
                      </Chip>
                    )}
                  </View>
                  <TextInput
                    mode="outlined"
                    label="Aesthetic"
                    value={(cis.recipient.aesthetic || []).join(", ")}
                    onChangeText={(v) => setCisField("recipient", "aesthetic", v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])}
                    dense
                    style={styles.cisInput}
                    outlineStyle={styles.cisInputOutline}
                  />
                </EditableCISSection>

                <Divider style={styles.cisDivider} />

                {/* Occasion section */}
                <EditableCISSection label="Occasion" hasEdits={sectionHasEdits("occasion")}>
                  <View style={styles.cisInputRow}>
                    <TextInput
                      mode="outlined"
                      label="Type"
                      value={cis.occasion.type}
                      onChangeText={(v) => setCisField("occasion", "type", v)}
                      dense
                      style={[styles.cisInput, styles.cisInputFlex]}
                      outlineStyle={styles.cisInputOutline}
                    />
                    <TextInput
                      mode="outlined"
                      label="Budget $"
                      value={cis.occasion.budget_usd != null ? String(cis.occasion.budget_usd) : ""}
                      onChangeText={(v) => setCisField("occasion", "budget_usd", v ? Number(v) : undefined)}
                      dense
                      keyboardType="numeric"
                      style={[styles.cisInput, { width: 90 }]}
                      outlineStyle={styles.cisInputOutline}
                    />
                  </View>
                  <TextInput
                    mode="outlined"
                    label="Date"
                    value={cis.occasion.date}
                    onChangeText={(v) => setCisField("occasion", "date", v)}
                    dense
                    style={styles.cisInput}
                    outlineStyle={styles.cisInputOutline}
                  />
                  <TextInput
                    mode="outlined"
                    label="Significance"
                    value={cis.occasion.significance || ""}
                    onChangeText={(v) => setCisField("occasion", "significance", v || undefined)}
                    dense
                    style={styles.cisInput}
                    outlineStyle={styles.cisInputOutline}
                  />
                </EditableCISSection>

                <Divider style={styles.cisDivider} />

                {/* History section */}
                <EditableCISSection label="History" hasEdits={sectionHasEdits("history")}>
                  {cis.history.prior_gifts.length > 0 ? (
                    cis.history.prior_gifts.map((gift, i) => (
                      <View key={i} style={styles.priorGiftRow}>
                        <Text variant="bodySmall" style={styles.priorGiftText}>
                          {gift.name}{gift.reaction ? ` — ${gift.reaction}` : ""}
                        </Text>
                        <IconButton
                          icon="close"
                          size={14}
                          onPress={() => handleRemovePriorGift(i)}
                          style={styles.removeGiftButton}
                        />
                      </View>
                    ))
                  ) : (
                    <Text variant="bodySmall" style={styles.cisSecondary}>
                      No prior gifts
                    </Text>
                  )}
                  <Text variant="labelSmall" style={styles.cisFieldLabel}>
                    Avoid
                  </Text>
                  <View style={styles.cisChipRow}>
                    {(cis.history.avoid || []).map((item, i) => (
                      <Chip
                        key={i}
                        compact
                        style={styles.cisAvoidChip}
                        onClose={() => handleRemoveAvoid(i)}
                      >
                        {item}
                      </Chip>
                    ))}
                    {addingAvoid ? (
                      <View style={styles.inlineAddRow}>
                        <TextInput
                          mode="outlined"
                          value={newAvoid}
                          onChangeText={setNewAvoid}
                          onSubmitEditing={handleAddAvoid}
                          placeholder="Add..."
                          dense
                          style={styles.inlineAddInput}
                          outlineStyle={styles.cisInputOutline}
                          autoFocus
                        />
                        <IconButton icon="check" size={16} onPress={handleAddAvoid} />
                        <IconButton icon="close" size={16} onPress={() => { setAddingAvoid(false); setNewAvoid(""); }} />
                      </View>
                    ) : (
                      <Chip
                        compact
                        icon="plus"
                        style={styles.addChip}
                        onPress={() => setAddingAvoid(true)}
                      >
                        Add
                      </Chip>
                    )}
                  </View>
                </EditableCISSection>
              </View>
            ) : (
              <Text variant="bodySmall" style={styles.cisSecondary}>
                Failed to load CIS data.
              </Text>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  );
};

type EditableCISSectionProps = {
  label: string;
  hasEdits: boolean;
  children: React.ReactNode;
};

const EditableCISSection: React.FC<EditableCISSectionProps> = ({ label, hasEdits, children }) => (
  <View style={styles.cisSection}>
    <View style={styles.cisSectionHeader}>
      <Text variant="labelMedium" style={styles.cisSectionLabel}>
        {label}
      </Text>
      {hasEdits && <Badge size={8} style={styles.editedBadge} />}
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cisTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontWeight: "600",
  },
  cisHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  collapseIcon: {
    margin: 0,
  },
  editedBadgeTitle: {
    backgroundColor: "#f59e0b",
  },
  cisLoading: {
    marginVertical: 12,
  },
  cisSections: {
    gap: 4,
  },
  cisSection: {
    marginVertical: 4,
  },
  cisSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  cisSectionLabel: {
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editedBadge: {
    backgroundColor: "#f59e0b",
  },
  cisInput: {
    marginBottom: 8,
    fontSize: 13,
  },
  cisInputOutline: {
    borderRadius: 6,
  },
  cisInputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  cisInputFlex: {
    flex: 1,
  },
  cisFieldLabel: {
    color: "#888",
    marginBottom: 4,
  },
  cisChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  cisInterestChip: {
    backgroundColor: "#e0f2fe",
  },
  cisAvoidChip: {
    backgroundColor: "#fee2e2",
  },
  addChip: {
    backgroundColor: "#f3f4f6",
  },
  inlineAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  inlineAddInput: {
    width: 100,
    height: 32,
    fontSize: 12,
  },
  cisDivider: {
    marginVertical: 8,
  },
  cisSecondary: {
    color: "#888",
    marginVertical: 8,
  },
  synthesizedProfileBox: {
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  synthesizedProfileText: {
    color: "#444",
    lineHeight: 18,
  },
  priorGiftRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  priorGiftText: {
    flex: 1,
    color: "#555",
  },
  removeGiftButton: {
    margin: 0,
  },
});
