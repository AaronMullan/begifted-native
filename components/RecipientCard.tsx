import type { Recipient } from "../types/recipient";
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

  let birthday = "";
  if (recipient.birthday) {
    const [year, month, day] = recipient.birthday.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    birthday = `Birthday: ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  const description = [relationship, birthday].filter(Boolean).join("\n");

  return (
    <MenuCard
      title={recipient.name}
      description={description}
      onPress={() => onPress(recipient)}
      showChevron
    />
  );
}
