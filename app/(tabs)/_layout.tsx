import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="library"
        options={{ title: "Library" }}
      />
    </Tabs>
  );
}
