import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api, { errMsg } from "../../../src/api";
import { isManager, useAuth } from "../../../src/auth";
import { toast } from "../../../src/toast";
import { MenuHeader, Screen, useShell } from "../../../src/components/layout";
import { Card, Icon } from "../../../src/components/ui";
import { C, F, fs, u } from "../../../src/theme";

// [label, route, icon, icon is already a circle?, managers only?]
const ITEMS = [
  ["My Profile", "/more/profile", "user-2", true],
  ["My Leave", "/more/leave", "logout1", true],
  ["Attendance", "/attendance", "calendar-cx", true],
  ["Work Calendar", "/more/calendar", "calendar", false],
  ["My Tasks", "/more/tasks", "clipboard-check", false],
  ["Notifications", "/more/notifications", "bell", false],
  ["Reports", "/more/reports", "ddcds", true, true],
  ["Daily Templates", "/more/templates", "template", false, true],
  ["Help & Support", "/more/help", "help", true],
  ["About Us", "/more/about", "bcv-vc", true],
];

// Screen-8: More
export default function More() {
  const router = useRouter();
  const { user } = useAuth();
  const shell = useShell();
  const readAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      shell?.refreshUnread();
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error(errMsg(e, "Unable to mark notifications read"));
    }
  };
  const items = ITEMS.filter((x) => !x[4] || isManager(user));
  return (
    <Screen
      header={
        <MenuHeader
          title="More"
          right={
            <Pressable onPress={readAll} hitSlop={8}>
              <Text style={ms.markAll}>Mark all read</Text>
            </Pressable>
          }
        />
      }
    >
      <Card style={ms.card}>
        {items.map(([l, to, icon, circle], i) => (
          <Pressable key={l} onPress={() => router.push(to)} style={({ pressed }) => [ms.row, i > 0 && ms.rowLine, pressed && { backgroundColor: "#f4f7fc" }]}>
            {circle ? (
              <Icon name={icon} size={u(48)} color={C.navy} />
            ) : (
              <View style={ms.circle}>
                <Icon name={icon} size={u(26)} color="#fff" />
              </View>
            )}
            <Text style={ms.text}>{l}</Text>
            <Ionicons name="chevron-forward" size={u(40)} color="#111" />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

const ms = StyleSheet.create({
  markAll: { fontFamily: F.m, fontSize: fs(21), color: "#fff" },
  card: { borderRadius: u(14), overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: u(42), minHeight: u(104), paddingLeft: u(16), paddingRight: u(14) },
  rowLine: { borderTopWidth: 1, borderTopColor: "#e5e5e5" },
  circle: { width: u(48), height: u(48), borderRadius: 99, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, fontFamily: F.r, fontSize: fs(30), color: "#000" },
});
