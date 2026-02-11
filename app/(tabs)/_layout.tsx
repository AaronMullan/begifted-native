import { Tabs } from "expo-router";

/**
 * Tabs layout keeps all main screens (Dashboard, Contacts, Calendar, Settings)
 * mounted when switching between them, so component state and data persist.
 * The default tab bar is hidden - we use our custom BottomNav instead.
 */
export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="contacts" options={{ title: "Contacts" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
