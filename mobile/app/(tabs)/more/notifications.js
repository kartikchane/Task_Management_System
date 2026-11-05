import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api, { errMsg } from "../../../src/api";
import { toast } from "../../../src/toast";
import { BackHeader, Screen, useShell } from "../../../src/components/layout";
import { Card, DateChip, Empty, Icon, Loading, Select } from "../../../src/components/ui";
import { C, F, fs, u } from "../../../src/theme";
import { dateTime } from "../../../src/utils";

// icon + colours for a notification type ("daily-assigned", "leave", "task-rework", ...)
function kind(type = "") {
  if (type.startsWith("leave")) return ["calendar", "#0d8a55", "#e2f8ef"];
  if (type.startsWith("task") || type.includes("project")) return ["notes", "#fb6a0c", "#fff2e5"];
  if (type.startsWith("daily") || type.includes("reminder")) return ["bell", "#5d63c0", "#d4d7fd"];
  if (type === "attendance" || type === "pattern" || type.includes("announce")) return ["ad1", "#5d63c0", "#f0e7fd"];
  return ["layout", "#0f38fc", "#e6eefd"];
}

// Screen-15: Notifications
export default function Notifications() {
  const router = useRouter();
  const shell = useShell();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const load = useCallback(
    () =>
      api
        .get("/notifications")
        .then((r) => {
          setRows(r.data);
          setError("");
          shell?.refreshUnread();
        })
        .catch((e) => setError(errMsg(e, "Unable to load notifications"))),
    [shell?.refreshUnread],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows || []).filter((x) => (!filter || (filter === "unread" ? !x.read : x.read)) && (!t || `${x.title} ${x.message}`.toLowerCase().includes(t)));
  }, [rows, q, filter]);
  const readAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      load();
    } catch (e) {
      toast.error(errMsg(e, "Unable to mark notifications read"));
    }
  };
  const open = async (x) => {
    if (!x.read) {
      api.patch(`/notifications/${x._id}/read`).then(load).catch(() => {});
      setRows((rs) => rs.map((r) => (r._id === x._id ? { ...r, read: true } : r)));
    }
    const to = { "/daily-work": "/daily-work", "/tasks": "/more/tasks", "/leave": "/more/leave", "/attendance": "/attendance", "/projects": "/projects", "/calendar": "/more/calendar" }[x.link];
    if (to) router.navigate(to);
  };
  return (
    <Screen header={<BackHeader bold title="Notification" subtitle="Assignments, submissions and important updates." right={<DateChip style={{ maxWidth: "56%", marginTop: u(6) }} />} />} onRefresh={load}>
      <Card style={ns.panel}>
        <View style={ns.search}>
          <Icon name="magnifying-glass" size={u(34)} color="#555" />
          <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor="#666" style={ns.searchInput} />
        </View>
        <View style={ns.actions}>
          <Select
            value={filter}
            onChange={setFilter}
            title="Show"
            style={ns.select}
            textStyle={{ fontFamily: F.s, fontSize: fs(23) }}
            options={[
              { value: "", label: "All notifications" },
              { value: "unread", label: "Unread" },
              { value: "read", label: "Read" },
            ]}
          />
          <Pressable onPress={load} style={ns.btn}>
            <Ionicons name="refresh" size={u(36)} color="#2f5bd0" />
            <Text style={ns.btnText}>Refresh</Text>
          </Pressable>
          <Pressable onPress={readAll} style={[ns.btn, { backgroundColor: "#e0eafd", borderColor: "#e0eafd" }]}>
            <Ionicons name="checkmark" size={u(44)} color="#1a3a9a" />
            <Text style={ns.btnText}>Mark all read</Text>
          </Pressable>
        </View>
        {error ? (
          <Empty title="Unable to load notifications" text={error} />
        ) : !rows ? (
          <Loading />
        ) : shown.length ? (
          <View style={{ gap: u(14) }}>
            {shown.map((x) => {
              const [icon, fg, bg] = kind(x.type);
              return (
                <Pressable key={x._id} onPress={() => open(x)} style={[ns.row, !x.read && ns.unread]}>
                  <View style={[ns.tile, { backgroundColor: bg }]}>
                    <Icon name={icon} size={u(46)} color={fg} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: u(18) }}>
                      <Text style={ns.title} numberOfLines={1}>
                        {x.title}
                      </Text>
                      {!x.read && (
                        <View style={ns.newPill}>
                          <Text style={ns.newText}>New</Text>
                        </View>
                      )}
                    </View>
                    <Text style={ns.msg} numberOfLines={2}>
                      {x.message}
                    </Text>
                    <Text style={ns.time}>{dateTime(x.createdAt)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Empty title={rows.length ? "No matching notifications" : "All caught up"} text={rows.length ? "Try a different search or filter." : "You have no notifications right now."} />
        )}
      </Card>
    </Screen>
  );
}

const ns = StyleSheet.create({
  panel: { borderRadius: u(18), paddingHorizontal: u(18), paddingTop: u(38), paddingBottom: u(32) },
  search: { flexDirection: "row", alignItems: "center", gap: u(14), height: u(56), backgroundColor: C.fieldBg, borderWidth: 2, borderColor: "#d6e3fa", borderRadius: u(10), paddingHorizontal: u(14), marginHorizontal: u(4) },
  searchInput: { flex: 1, fontFamily: F.r, fontSize: fs(23), color: "#111", minWidth: 0, paddingVertical: 0, outlineStyle: "none" },
  actions: { flexDirection: "row", gap: u(16), justifyContent: "center", marginTop: u(32), marginBottom: u(28) },
  select: { minHeight: u(58), borderWidth: 2, borderColor: C.fieldLine, paddingHorizontal: u(14), flexShrink: 1, flexGrow: 0, width: "38%" },
  btn: { flexDirection: "row", alignItems: "center", gap: u(10), height: u(58), paddingHorizontal: u(14), borderWidth: 2, borderColor: C.fieldLine, borderRadius: u(10), backgroundColor: "#fff" },
  btnText: { fontFamily: F.s, fontSize: fs(22), color: C.blueText },
  row: { flexDirection: "row", alignItems: "center", gap: u(16), borderWidth: 2, borderColor: "#edf1fd", borderRadius: u(14), padding: u(14), backgroundColor: "#fff" },
  unread: { backgroundColor: "#edf1fd" },
  tile: { width: u(76), height: u(76), borderRadius: u(12), alignItems: "center", justifyContent: "center" },
  title: { fontFamily: F.m, fontSize: fs(23), color: "#000", flexShrink: 1 },
  newPill: { backgroundColor: "#d9dcfb", borderRadius: u(8), paddingHorizontal: u(14) },
  newText: { fontFamily: F.r, fontSize: fs(18), color: "#5d63c0" },
  msg: { fontFamily: F.r, fontSize: fs(20), color: "#555", marginTop: u(2) },
  time: { fontFamily: F.r, fontSize: fs(17), color: "#444", marginTop: u(2) },
});
