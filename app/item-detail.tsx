import { Stack } from "expo-router";

export default function RootLayout() {
  // Minimal root layout to eliminate any invalid prop types.
  // No screenOptions, no custom props, no string booleans.
  return <Stack />;
}
