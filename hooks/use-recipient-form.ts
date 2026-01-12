import { useState, useEffect } from "react";
import type { Recipient } from "../types/recipient";

type RecipientFormValues = {
  name: string;
  relationshipType: string;
  interests: string;
  birthday: string;
  emotionalTone: string;
  budgetMin: string;
  budgetMax: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

type OriginalValues = {
  name: string;
  birthday: string;
  relationship_type: string;
  interests: string;
  emotional_tone_preference: string;
  gift_budget_min?: number;
  gift_budget_max?: number;
  address: string;
  address_line_2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
};

export function useRecipientForm(recipient: Recipient | null) {
  // Form state
  const [name, setName] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [interests, setInterests] = useState("");
  const [birthday, setBirthday] = useState("");
  const [emotionalTone, setEmotionalTone] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [address, setAddress] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("US");
  const [hasChanges, setHasChanges] = useState(false);
  const [originalValues, setOriginalValues] = useState<OriginalValues | null>(
    null
  );

  // Populate form when recipient changes
  useEffect(() => {
    if (recipient) {
      setName(recipient.name);
      setRelationshipType(recipient.relationship_type);
      setInterests(recipient.interests ? recipient.interests.join(", ") : "");
      setBirthday(recipient.birthday || "");
      setEmotionalTone(recipient.emotional_tone_preference || "");
      setBudgetMin(recipient.gift_budget_min?.toString() || "");
      setBudgetMax(recipient.gift_budget_max?.toString() || "");
      setAddress(recipient.address || "");
      setAddressLine2(recipient.address_line_2 || "");
      setCity(recipient.city || "");
      setState(recipient.state || "");
      setZipCode(recipient.zip_code || "");
      setCountry(recipient.country || "US");
    }
  }, [recipient]);

  // Capture original values when recipient changes
  useEffect(() => {
    if (recipient) {
      setOriginalValues({
        name: recipient.name,
        birthday: recipient.birthday || "",
        relationship_type: recipient.relationship_type,
        interests: recipient.interests?.join(", ") || "",
        emotional_tone_preference: recipient.emotional_tone_preference || "",
        gift_budget_min: recipient.gift_budget_min,
        gift_budget_max: recipient.gift_budget_max,
        address: recipient.address || "",
        address_line_2: recipient.address_line_2 || "",
        city: recipient.city || "",
        state: recipient.state || "",
        zip_code: recipient.zip_code || "",
        country: recipient.country || "US",
      });
      setHasChanges(false); // Reset when recipient changes
    }
  }, [recipient?.id]);

  // Utility function to wrap onChangeText handlers and mark changes
  const createChangeHandler = (setter: (value: string) => void) => {
    return (value: string) => {
      setter(value);
      setHasChanges(true);
    };
  };

  const resetChanges = () => {
    setHasChanges(false);
  };

  const getFormData = () => {
    const interestsArray = interests
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    return {
      name: name.trim(),
      relationship_type: relationshipType.trim(),
      interests: interestsArray.length > 0 ? interestsArray : undefined,
      birthday: birthday.trim() || undefined,
      emotional_tone_preference: emotionalTone.trim() || undefined,
      gift_budget_min: budgetMin ? parseInt(budgetMin) : undefined,
      gift_budget_max: budgetMax ? parseInt(budgetMax) : undefined,
      address: address.trim() || undefined,
      address_line_2: addressLine2.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      zip_code: zipCode.trim() || undefined,
      country: country.trim() || undefined,
    };
  };

  const hasGiftRelevantChanges = () => {
    if (!originalValues) return false;

    const interestsArray = interests
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);
    const newInterests = interestsArray.join(", ");
    const newBudgetMin = budgetMin ? parseInt(budgetMin) : undefined;
    const newBudgetMax = budgetMax ? parseInt(budgetMax) : undefined;
    const newBirthday = birthday.trim() || "";
    const newName = name.trim();

    return (
      newName !== originalValues.name ||
      newBirthday !== originalValues.birthday ||
      relationshipType.trim() !== originalValues.relationship_type ||
      newInterests !== originalValues.interests ||
      emotionalTone.trim() !== originalValues.emotional_tone_preference ||
      newBudgetMin !== originalValues.gift_budget_min ||
      newBudgetMax !== originalValues.gift_budget_max
    );
  };

  return {
    // Form values
    name,
    relationshipType,
    interests,
    birthday,
    emotionalTone,
    budgetMin,
    budgetMax,
    address,
    addressLine2,
    city,
    state,
    zipCode,
    country,
    // Setters (for use with createChangeHandler)
    setName,
    setRelationshipType,
    setInterests,
    setBirthday,
    setEmotionalTone,
    setBudgetMin,
    setBudgetMax,
    setAddress,
    setAddressLine2,
    setCity,
    setState,
    setZipCode,
    setCountry,
    // Change tracking
    hasChanges,
    createChangeHandler,
    resetChanges,
    // Data helpers
    getFormData,
    hasGiftRelevantChanges,
    originalValues,
  };
}
