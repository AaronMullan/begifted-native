import type { Recipient } from "../types/recipient";
import { formatShortName } from "../lib/format-name";
import { parseBirthdayParts } from "../utils/birthday";
import MenuCard from "./MenuCard";

type RecipientCardProps = {
  recipient: Recipient;
  onPress: (recipient: Recipient) => void;
};

export default function RecipientCard({ recipient, onPress }: RecipientCardProps) {
  const relationship =
    recipient.relationship_type && recipient.relationship_type !== "null"
      ? recipient.relationship_type
      : "";

  const birthdayParts = parseBirthdayParts(recipient.birthday);
  let birthday = "";
  if (birthdayParts) {
    const date = new Date(
      birthdayParts.year ?? 2000,
      birthdayParts.month - 1,
      birthdayParts.day
    );
    birthday = `Birthday: ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(birthdayParts.year !== null ? { year: "numeric" } : {}),
    })}`;
  }

  const description = [relationship, birthday].filter(Boolean).join("\n");

  return (
    <MenuCard
      title={formatShortName(recipient.name)}
      description={description}
      onPress={() => onPress(recipient)}
      showChevron
      imageUri={recipient.photo_url ?? undefined}
    />
  );
}
