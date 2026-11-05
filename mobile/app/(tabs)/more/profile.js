import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/auth";
import { Avatar, BackHeader, Screen } from "../../../src/components/layout";
import { Card, Icon } from "../../../src/components/ui";
import { C, F, fs, u } from "../../../src/theme";
import { confirm, roleLabel } from "../../../src/utils";

// Screen-9: My Profile
export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const rows = [
    ["Personal Information", "user-2", () => router.push("/more/personal")],
    ["Change password", "lock", () => router.push("/more/password")],
  ];
  return (
    <Screen header={<BackHeader title="My Profile" search />}>
      <Card style={ps.card}>
        <View style={ps.top}>
          <Avatar user={user} size={u(168)} border />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={ps.name}>{user.name}</Text>
            <Text style={ps.line}>{user.designation || roleLabel(user.role)}</Text>
            {!!user.employeeCode && <Text style={ps.line}>{user.employeeCode}</Text>}
          </View>
        </View>
        {rows.map(([l, icon, onPress]) => (
          <Pressable key={l} onPress={onPress} style={({ pressed }) => [ps.row, pressed && { backgroundColor: "#f4f7fc" }]}>
            <Icon name={icon} size={u(46)} color={C.navy} />
            <Text style={ps.text}>{l}</Text>
            <Ionicons name="chevron-forward" size={u(40)} color="#111" />
          </Pressable>
        ))}
        <View style={ps.row}>
          <Icon name="dynamic" size={u(52)} color={C.navy} />
          <Text style={ps.text}>Appearance</Text>
          <Text style={ps.value}>Light</Text>
          <Icon name="brightness" size={u(38)} color="#000" />
        </View>
        <View style={ps.row}>
          <Icon name="language" size={u(52)} color={C.navy} />
          <Text style={ps.text}>Language</Text>
          <Text style={ps.value}>English</Text>
        </View>
        <Pressable
          onPress={async () => {
            if (await confirm("Logout", "Do you want to log out of TaskFlow?", "Logout", true)) logout();
          }}
          style={({ pressed }) => [ps.row, pressed && { backgroundColor: "#fff4f4" }]}
        >
          <Icon name="switch" size={u(46)} color="#ff0000" />
          <Text style={[ps.text, { color: "#ff0000" }]}>Logout</Text>
          <Ionicons name="chevron-forward" size={u(40)} color="#111" />
        </Pressable>
      </Card>
    </Screen>
  );
}

const ps = StyleSheet.create({
  card: { borderRadius: u(14), overflow: "hidden" },
  top: { flexDirection: "row", alignItems: "center", gap: u(52), paddingHorizontal: u(74), paddingVertical: u(58) },
  name: { fontFamily: F.s, fontSize: fs(36), color: "#000" },
  line: { fontFamily: F.r, fontSize: fs(26), color: "#000", marginTop: u(12) },
  row: { flexDirection: "row", alignItems: "center", gap: u(34), minHeight: u(112), paddingHorizontal: u(22), borderTopWidth: 1, borderTopColor: "#e5e5e5" },
  text: { flex: 1, fontFamily: F.r, fontSize: fs(26), color: "#000" },
  value: { fontFamily: F.r, fontSize: fs(26), color: "#000" },
});
