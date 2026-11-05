import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Icon, Select } from "./ui";
import { C, F, fs, u } from "../theme";

// Search box + status dropdown + Refresh (also used on My Tasks)
export function Toolbar({ search, setSearch, placeholder, status, setStatus, statuses, onRefresh }) {
  return (
    <View style={ts.toolbar}>
      <View style={ts.search}>
        <Icon name="magnifying-glass" size={u(34)} color="#555" />
        <TextInput value={search} onChangeText={setSearch} placeholder={placeholder} placeholderTextColor="#666" style={ts.searchInput} />
        {!!search && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={u(32)} color="#9aa0ae" />
          </Pressable>
        )}
      </View>
      <Select value={status} onChange={setStatus} options={statuses} title="Status" style={ts.status} textStyle={ts.statusText} />
      <Pressable onPress={onRefresh} style={({ pressed }) => [ts.refresh, pressed && { opacity: 0.7 }]}>
        <Ionicons name="refresh" size={u(36)} color="#2f5bd0" />
        <Text style={ts.refreshText}>Refresh</Text>
      </Pressable>
    </View>
  );
}


const ts = StyleSheet.create({
  toolbar: { flexDirection: "row", alignItems: "center", gap: u(16), backgroundColor: "#f8f8f8", borderRadius: u(12), padding: u(14) },
  search: {
    flex: 1.15,
    flexDirection: "row",
    alignItems: "center",
    gap: u(14),
    height: u(56),
    backgroundColor: C.fieldBg,
    borderWidth: 2,
    borderColor: "#d6e3fa",
    borderRadius: u(10),
    paddingHorizontal: u(20),
    minWidth: 0,
  },
  searchInput: { flex: 1, fontFamily: F.r, fontSize: fs(22), color: "#111", minWidth: 0, paddingVertical: 0, outlineStyle: "none" },
  status: { flex: 0.85, minHeight: u(56), borderWidth: 2, borderColor: C.fieldLine, paddingHorizontal: u(16) },
  statusText: { fontFamily: F.s, fontSize: fs(21), color: "#000" },
  refresh: { flexDirection: "row", alignItems: "center", gap: u(10), height: u(56), paddingHorizontal: u(16), borderWidth: 2, borderColor: C.fieldLine, borderRadius: u(10), backgroundColor: "#fff" },
  refreshText: { fontFamily: F.s, fontSize: fs(21), color: C.blueText },
});
