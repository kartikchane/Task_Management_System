import { Stack } from "expo-router";

// Everything opened from the "More" tab keeps the bottom bar, like the design.
export default function MoreLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: "#2f4392" } }} />;
}
