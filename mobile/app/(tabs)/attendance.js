import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect } from "react-native-svg";
import api, { errMsg } from "../../src/api";
import { isManager, useAuth } from "../../src/auth";
import { toast } from "../../src/toast";
import { PageTitle, Screen, TopBar } from "../../src/components/layout";
import { Btn, Card, DateField, Empty, Icon, Loading, Pill, Select } from "../../src/components/ui";
import { C, F, fs, tones, u } from "../../src/theme";
import { label, statusTone, time, todayIso } from "../../src/utils";

// Screen-7: Attendance (managers also get a Team tab)
export default function Attendance() {
  const { user } = useAuth();
  const [tab, setTab] = useState("mine");
  const manager = isManager(user);
  return (
    <Screen header={<TopBar />} onRefresh={undefined}>
      <PageTitle title="Attendance" subtitle="Track check-in, check-out and working hours." />
      {manager && (
        <View style={as.segments}>
          {[
            ["mine", "My attendance"],
            ["team", "Team"],
          ].map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[as.segment, tab === k && as.segmentOn]}>
              <Text style={[as.segmentText, tab === k && { color: "#fff" }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {tab === "mine" ? <MyAttendance /> : <TeamAttendance />}
    </Screen>
  );
}

function MyAttendance() {
  const [x, setX] = useState(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(
    () =>
      api
        .get("/attendance/today")
        .then((r) => {
          setX(r.data);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load attendance"))),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const act = async (p) => {
    setBusy(p);
    try {
      const { data } = await api.post("/attendance/" + p);
      setX(data);
      toast.success(p === "check-in" ? "Checked in" : "Checked out");
    } catch (e) {
      toast.error(errMsg(e, "Attendance action failed"));
    } finally {
      setBusy("");
    }
  };
  if (x === undefined && !error) return <Loading color="#fff" />;
  const st = x?.status;
  return (
    <Card style={as.card}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", paddingHorizontal: u(32) }}>
        <View style={{ flex: 1 }}>
          <Text style={as.title}>Today</Text>
          <Text style={as.sub}>{error || "Your attendance record for the current working day."}</Text>
        </View>
        <Pill text={st || "Not checked in"} tone={statusTone[st] || "muted"} textStyle={{ fontFamily: F.r, fontSize: fs(21) }} style={{ paddingHorizontal: u(20) }} />
      </View>
      <View style={as.policy}>
        <Ionicons name="time" size={u(42)} color="#036729" />
        <View style={{ flex: 1 }}>
          <Text style={as.policyTitle}>Attendance policy</Text>
          <Text style={as.policyText}>Check in and check out record your working time. Final attendance status is reviewed and marked by your manager.</Text>
        </View>
      </View>
      <View style={as.grid}>
        <Item tone="navy" icon={<Icon name="clock" size={u(32)} color={tones.navy.fg} />} label="Check in" value={time(x?.checkIn)} />
        <Item tone="orange" icon={<Icon name="top-right" size={u(30)} color={tones.orange.fg} />} label="Check out" value={time(x?.checkOut)} />
        <Item
          tone="green"
          icon={
            <Svg width={u(32)} height={u(32)} viewBox="0 0 24 24">
              <Rect x="2.5" y="11" width="5.2" height="11" rx="1.2" fill="#05692a" />
              <Rect x="9.4" y="4" width="5.2" height="18" rx="1.2" fill="#05692a" />
              <Rect x="16.3" y="8" width="5.2" height="14" rx="1.2" fill="#05692a" />
            </Svg>
          }
          label="Worked"
          value={`${x?.workedMinutes || 0} min`}
        />
        <Item tone="purple" icon={<Icon name="calendar" size={u(30)} color="#7a5af8" />} label="Date" value={x?.date || todayIso()} />
      </View>
      <View style={as.actions}>
        <Btn title="Check in" icon="check-in" small onPress={() => act("check-in")} disabled={!!x?.checkIn} loading={busy === "check-in"} style={{ backgroundColor: C.primary }} />
        <Btn
          title="Check out"
          variant="outlineDark"
          small
          icon={<Icon name="logout" size={u(34)} color="#000" />}
          onPress={() => act("check-out")}
          disabled={!x?.checkIn || !!x?.checkOut}
          loading={busy === "check-out"}
        />
      </View>
    </Card>
  );
}

const Item = ({ tone, icon, label: l, value }) => (
  <View style={as.item}>
    <View style={[as.itemTile, { backgroundColor: tones[tone].bg }]}>{icon}</View>
    <View>
      <Text style={as.itemLabel}>{l}</Text>
      <Text style={as.itemValue}>{value}</Text>
    </View>
  </View>
);

function TeamAttendance() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [date, setDate] = useState(todayIso());
  const load = useCallback(
    () =>
      api
        .get("/attendance", { params: { date } })
        .then((r) => {
          setRows(r.data);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load team attendance"))),
    [date],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const mark = async (row, status) => {
    try {
      const { data } = await api.patch("/attendance/" + row._id, { status, note: row.note || "" });
      setRows((rs) => rs.map((r) => (r._id === row._id ? data : r)));
      toast.success("Attendance updated");
    } catch (e) {
      toast.error(errMsg(e, "Unable to update attendance"));
    }
  };
  return (
    <>
      <Card style={{ padding: u(16), marginBottom: u(24) }}>
        <DateField value={date} onChange={setDate} />
      </Card>
      {error ? (
        <Empty title="Unable to load" text={error} />
      ) : !rows ? (
        <Loading color="#fff" />
      ) : rows.length ? (
        <View style={{ gap: u(18) }}>
          {rows.map((r) => (
            <Card key={r._id} style={{ padding: u(26) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={as.name}>{r.employee?.name || "Employee"}</Text>
                  <Text style={as.sub}>
                    In {time(r.checkIn)} · Out {time(r.checkOut)} · {r.workedMinutes || 0} min
                  </Text>
                </View>
                <Select
                  value={r.status}
                  onChange={(v) => mark(r, v)}
                  compact
                  style={{ width: u(240) }}
                  title="Mark attendance"
                  options={["present", "late", "half-day", "absent", "leave", "holiday"].map((v) => ({ value: v, label: label(v) }))}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Empty title="No attendance records" text="No one has checked in for this date yet." />
      )}
    </>
  );
}

const as = StyleSheet.create({
  segments: { flexDirection: "row", backgroundColor: "#fff", borderRadius: u(16), padding: u(10), gap: u(10), marginBottom: u(26) },
  segment: { flex: 1, alignItems: "center", paddingVertical: u(14), borderRadius: u(10), borderWidth: 1.5, borderColor: C.fieldLine },
  segmentOn: { backgroundColor: C.primary, borderColor: C.primary },
  segmentText: { fontFamily: F.s, fontSize: fs(23), color: C.blueText },
  card: { paddingTop: u(22), paddingBottom: u(20), borderRadius: u(18) },
  title: { fontFamily: F.s, fontSize: fs(32), color: "#000" },
  sub: { fontFamily: F.r, fontSize: fs(20), color: "#111", marginTop: u(4) },
  name: { fontFamily: F.s, fontSize: fs(25), color: "#000" },
  policy: { flexDirection: "row", alignItems: "center", gap: u(28), marginHorizontal: u(32), marginTop: u(20), backgroundColor: "#eafbf3", borderWidth: 2, borderColor: "#c3f4e2", borderRadius: u(14), padding: u(18) },
  policyTitle: { fontFamily: F.s, fontSize: fs(25), color: "#036729" },
  policyText: { fontFamily: F.r, fontSize: fs(20), color: "#036729", marginTop: u(2) },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: u(30), paddingHorizontal: u(50), paddingVertical: u(30), borderBottomWidth: 1, borderBottomColor: C.line, marginHorizontal: u(26) },
  item: { width: "50%", flexDirection: "row", alignItems: "center", gap: u(22) },
  itemTile: { width: u(44), height: u(44), borderRadius: u(8), alignItems: "center", justifyContent: "center" },
  itemLabel: { fontFamily: F.r, fontSize: fs(21), color: "#000" },
  itemValue: { fontFamily: F.r, fontSize: fs(21), color: "#000" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: u(20), paddingHorizontal: u(34), paddingTop: u(24) },
});
