import { Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, fs, u } from "../../src/theme";

const TABS = [
  { name: "index", label: "Dashboard", icon: "home" },
  { name: "projects", label: "Projects", icon: "folder-open" },
  { name: "daily-work", label: "Daily work", icon: "calendar" },
  { name: "attendance", label: "Attendance", icon: "time" },
  { name: "more", label: "More", icon: "ellipsis-horizontal-circle" },
];

// White bottom bar from the design: active tab navy and filled, others light grey outlines.
function BottomBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[bs.bar, { paddingBottom: Math.max(insets.bottom, u(20)) }]}>
      {TABS.map((t) => {
        const index = state.routes.findIndex((r) => r.name === t.name);
        const focused = state.index === index;
        const onPress = () => {
          const route = state.routes[index];
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (event.defaultPrevented) return;
          // tapping "More" again always goes back to the More list
          if (t.name === "more") navigation.navigate("more", { screen: "index" });
          else navigation.navigate(route.name);
        };
        return (
          <Pressable key={t.name} onPress={onPress} style={bs.item} accessibilityRole="tab" accessibilityState={{ selected: focused }}>
            <Ionicons name={focused ? t.icon : t.icon + "-outline"} size={u(50)} color={focused ? C.navy : C.tabInactive} />
            <Text style={[bs.label, { color: focused ? C.navy : C.tabInactive }]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <BottomBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.navy } }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}

const bs = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#c1c2c4",
    paddingTop: u(18),
  },
  item: { flex: 1, alignItems: "center", gap: u(4) },
  label: { fontFamily: F.m, fontSize: fs(21) },
});
