import { Stack } from "expo-router";

export default function ContactsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}
