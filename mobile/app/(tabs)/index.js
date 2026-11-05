import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import api, { errMsg } from "../../src/api";
import { isManager, useAuth } from "../../src/auth";
import { Screen, TopBar } from "../../src/components/layout";
import { Card, Empty, Icon, Loading, StatCard } from "../../src/components/ui";
import { C, F, fs, u } from "../../src/theme";

// Screen-4: Dashboard
export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      api
        .get("/dashboard")
        .then((r) => {
          setData(r.data);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load dashboard"))),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const t = data?.stats?.tasks || {};
  const today = data?.today || {};
  const manager = isManager(user);
  const now = new Date();
  const eyebrow = `${now.toLocaleDateString("en-IN", { weekday: "long" })}, ${now.getDate()} ${now.toLocaleDateString("en-IN", { month: "long" })}`.toUpperCase();
  const cards = manager
    ? [
        [data?.stats?.users ?? 0, user.role === "admin" ? "My Team" : "People", "group", "blue", null],
        [data?.stats?.departments ?? 0, "Departments", "building", "green", null],
        [data?.stats?.projects ?? 0, "Projects", "open-folder", "orange", "/projects"],
        [t.total || 0, "Daily Tasks", "checklist", "purple", "/daily-work"],
      ]
    : [
        [t.total || 0, "My Tasks", "checklist", "blue", "/daily-work"],
        [t["in-progress"] || 0, "In Progress", "clock", "green", "/daily-work"],
        [t.pending || 0, "Pending", "top-right", "orange", "/daily-work"],
        [t.approved || 0, "Completed", "checked", "purple", "/daily-work"],
      ];
  const command = [
    ["due-date", "Due Today", today.dueToday, "#1d1df0", "/daily-work"],
    ["warning", "Overdue", today.overdue, "#e5141b", "/daily-work"],
    ["airplane", "Pending Leave", today.pendingLeaves, "#1d1df0", "/more/leave"],
    ["checked", "Present", today.present, "#179760", "/attendance"],
    ["timer", "Late", today.late, "#fb800c", "/attendance"],
    ["time", "Daily submitted", today.dailySubmitted, "#1d1df0", "/daily-work"],
  ];
  const health = [
    ["Completed", t.approved, "#0f8f6b"],
    ["In Progress", t["in-progress"], "#1956d6"],
    ["Pending", t.pending, "#f7931e"],
    ["Overdue", t.overdue, "#ef3b3b"],
    ["Submitted", t.submitted, "#7c3aed"],
    ["Rework", t.rework, "#9a9a9a"],
  ];

  return (
    <Screen header={<TopBar />} onRefresh={load}>
      <View style={ds.hero}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={ds.eyebrow}>{eyebrow}</Text>
          <Text style={ds.hello} numberOfLines={2}>
            Good to see you, {user.name.split(" ")[0]}
          </Text>
          <Text style={ds.code}>{manager ? "Here is your workspace today." : `Employee ID : ${user.employeeCode || "Not assigned"}`}</Text>
        </View>
        <Pressable onPress={() => router.push("/more/tasks")} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
          <LinearGradient colors={["#22b6fb", "#1aa5f3"]} style={ds.sky}>
            <Text style={ds.skyText}>Open task board</Text>
            <Icon name="top-right" size={u(24)} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>

      {error ? (
        <Empty title="Unable to load dashboard" text={error} />
      ) : !data ? (
        <Loading color="#fff" />
      ) : (
        <>
          <View style={ds.grid}>
            {cards.map(([v, l, icon, tone, to]) => (
              <StatCard key={l} value={v} label={l} icon={icon} tone={tone} style={ds.gridItem} onPress={to ? () => router.push(to) : undefined} />
            ))}
          </View>

          <Card style={ds.cmd}>
            <Text style={ds.cardTitle}>Today Command Center</Text>
            <Text style={ds.cardSub}>Fast operational signals for the current day</Text>
            <View style={ds.cmdLine} />
            {[0, 1].map((row) => (
              <View key={row}>
                <View style={ds.cmdRow}>
                  {command.slice(row * 3, row * 3 + 3).map(([icon, l, v, color, to], i) => (
                    <Pressable key={l} onPress={() => router.push(to)} style={[ds.cmdCell, i > 0 && ds.cmdCellLine]}>
                      <Icon name={icon} size={u(36)} color={color} />
                      <Text style={ds.cmdLabel} numberOfLines={1}>
                        {l}
                      </Text>
                      <Text style={ds.cmdValue}>{v || 0}</Text>
                    </Pressable>
                  ))}
                </View>
                {row === 0 && <View style={[ds.cmdLine, { marginTop: 0 }]} />}
              </View>
            ))}
          </Card>

          <Card style={ds.health}>
            <Text style={ds.cardTitle}>Task health</Text>
            <Text style={ds.cardSub}>Current status distribution</Text>
            <View style={{ marginTop: u(14) }}>
              {health.map(([l, v, color]) => (
                <View key={l} style={ds.healthRow}>
                  <View style={[ds.dot, { backgroundColor: color }]} />
                  <Text style={ds.healthLabel}>{l}</Text>
                  <Text style={ds.healthValue}>{v || 0}</Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

const ds = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: u(16), marginTop: u(8), marginBottom: u(34) },
  eyebrow: { fontFamily: F.m, fontSize: fs(21), color: "#fff" },
  hello: { fontFamily: F.b, fontSize: fs(38), color: "#fff", marginTop: u(6) },
  code: { fontFamily: F.r, fontSize: fs(21), color: "#fff", marginTop: u(4) },
  sky: { flexDirection: "row", alignItems: "center", gap: u(14), paddingHorizontal: u(24), height: u(62), borderRadius: u(12), borderWidth: 1, borderColor: "#7fd2ff" },
  skyText: { fontFamily: F.m, fontSize: fs(21), color: "#fff" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: u(22) },
  gridItem: { width: "48.6%" },
  cmd: { marginTop: u(32), paddingHorizontal: u(26), paddingTop: u(34), paddingBottom: u(26), borderRadius: u(28) },
  cardTitle: { fontFamily: F.m, fontSize: fs(31), color: "#000", marginLeft: u(6) },
  cardSub: { fontFamily: F.r, fontSize: fs(21), color: "#111", marginLeft: u(6) },
  cmdLine: { height: 1, backgroundColor: C.line, marginTop: u(22) },
  cmdRow: { flexDirection: "row", paddingVertical: u(30) },
  cmdCell: { flex: 1, alignItems: "center", gap: u(6) },
  cmdCellLine: { borderLeftWidth: 1, borderLeftColor: C.line },
  cmdLabel: { fontFamily: F.r, fontSize: fs(21), color: "#111", marginTop: u(4) },
  cmdValue: { fontFamily: F.b, fontSize: fs(36), color: "#000" },
  health: { marginTop: u(32), paddingHorizontal: u(52), paddingTop: u(30), paddingBottom: u(12), borderRadius: u(22) },
  healthRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: C.line, paddingVertical: u(16) },
  dot: { width: u(15), height: u(15), borderRadius: 99, marginRight: u(22) },
  healthLabel: { flex: 1, fontFamily: F.r, fontSize: fs(23), color: "#111" },
  healthValue: { fontFamily: F.m, fontSize: fs(23), color: "#000", marginRight: u(12) },
});
