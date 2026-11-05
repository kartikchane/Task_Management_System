import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api, { errMsg } from "../../../src/api";
import { isManager, useAuth } from "../../../src/auth";
import { toast } from "../../../src/toast";
import { BackHeader, Screen } from "../../../src/components/layout";
import { Btn, Card, DateChip, DateField, Divider, Field, Loading, Pill, Select, StatCard, TextField } from "../../../src/components/ui";
import { C, F, fs, u } from "../../../src/theme";
import { label, todayIso } from "../../../src/utils";

const TONE = { pending: "orange", approved: "green", rejected: "red", cancelled: "muted" };
const EMPTY = { type: "casual", fromDate: "", toDate: "", reason: "" };

// Screen-12: Leave Management
export default function Leave() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const load = useCallback(
    () =>
      api
        .get("/leaves")
        .then((r) => {
          setRows(r.data);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load leave requests"))),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const counts = useMemo(() => {
    const r = rows || [];
    return { total: r.length, pending: r.filter((x) => x.status === "pending").length, approved: r.filter((x) => x.status === "approved").length, rejected: r.filter((x) => x.status === "rejected").length };
  }, [rows]);
  const submit = async () => {
    if (!f.fromDate || !f.toDate || !f.reason.trim()) return toast.error("Choose the dates and write a reason");
    if (f.toDate < f.fromDate) return toast.error("'To' date can't be before 'From' date");
    setBusy(true);
    try {
      await api.post("/leaves", f);
      toast.success("Leave request submitted");
      setF(EMPTY);
      load();
    } catch (e) {
      toast.error(errMsg(e, "Unable to submit leave request"));
    } finally {
      setBusy(false);
    }
  };
  const review = async (id, decision) => {
    try {
      await api.post(`/leaves/${id}/review`, { decision });
      toast.success(decision === "approved" ? "Leave approved" : "Leave rejected");
      load();
    } catch (e) {
      toast.error(errMsg(e, "Unable to review leave"));
    }
  };
  return (
    <Screen
      header={<BackHeader bold title={"Leave\nManagement"} subtitle="Request leave and track approvals." right={<DateChip style={{ maxWidth: "56%", marginTop: u(6) }} />} />}
      onRefresh={load}
      keyboard
    >
      <View style={ls.grid}>
        <StatCard label="Request" value={counts.total} sub="Leave" icon="checklist" tone="blue" style={ls.gridItem} />
        <StatCard label="Pending" value={counts.pending} sub="Leave" icon={<Ionicons name="sync" size={u(52)} color="#179760" />} tone="green" style={ls.gridItem} />
        <StatCard label="Approved" value={counts.approved} sub="Leave" icon="checked" tone="orange" style={ls.gridItem} />
        <StatCard label="Rejected" value={counts.rejected} sub="Leave" icon={<Ionicons name="close-circle" size={u(56)} color="#7419ee" />} tone="purple" style={ls.gridItem} />
      </View>

      <Card style={ls.card}>
        <Text style={ls.h3}>New Request</Text>
        <Text style={ls.sub}>{isManager(user) ? "Submit your own leave request." : "Submit dates and reason for manager review."}</Text>
        <Divider style={{ marginTop: u(16), marginHorizontal: -u(12) }} />
        <Field label="Type" style={{ marginTop: u(22) }}>
          <Select value={f.type} onChange={set("type")} options={["casual", "sick", "earned", "unpaid", "other"]} title="Leave type" />
        </Field>
        <View style={{ flexDirection: "row", gap: u(34) }}>
          <Field label="From" style={{ flex: 1 }}>
            <DateField value={f.fromDate} onChange={set("fromDate")} min={todayIso()} />
          </Field>
          <Field label="To" style={{ flex: 1 }}>
            <DateField value={f.toDate} onChange={set("toDate")} min={f.fromDate || todayIso()} />
          </Field>
        </View>
        <Field label="Reason">
          <TextField multiline minHeight={u(66)} value={f.reason} onChangeText={set("reason")} placeholder="Enter reason for leave request" />
        </Field>
        <Divider style={{ marginTop: u(30), marginHorizontal: -u(12) }} />
        <Btn title="Submit Request" icon="send" small loading={busy} onPress={submit} style={{ alignSelf: "flex-end", marginTop: u(24) }} />
      </Card>

      <Card style={[ls.card, { marginTop: u(38) }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={[ls.h3, { fontFamily: F.r, fontSize: fs(32) }]}>Leave Requests</Text>
            <Text style={ls.sub}>View and track your leave requests.</Text>
          </View>
          <Pressable onPress={load} style={ls.refresh}>
            <Ionicons name="refresh" size={u(34)} color="#2f5bd0" />
            <Text style={ls.refreshText}>Refresh</Text>
          </Pressable>
        </View>
        {error ? (
          <Text style={[ls.sub, { marginTop: u(20), color: C.red }]}>{error}</Text>
        ) : !rows ? (
          <Loading />
        ) : rows.length ? (
          <View style={{ marginTop: u(20), gap: u(14) }}>
            {rows.map((x) => {
              const mine = String(x.employee?._id || x.employee) === String(user.id || user._id);
              return (
                <View key={x._id} style={ls.item}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={ls.itemTitle} numberOfLines={1}>
                      {x.employee?.name || user.name}
                    </Text>
                    <Pill text={x.status} tone={TONE[x.status] || "muted"} />
                  </View>
                  <Text style={ls.sub}>
                    {label(x.type)} · {x.fromDate} to {x.toDate}
                  </Text>
                  {!!x.reason && (
                    <Text style={[ls.sub, { color: "#555" }]} numberOfLines={2}>
                      {x.reason}
                    </Text>
                  )}
                  {!!x.reviewedBy?.name && <Text style={[ls.sub, { color: "#555" }]}>Reviewed by {x.reviewedBy.name}</Text>}
                  {isManager(user) && x.status === "pending" && !mine && (
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                      <Btn title="Approve" variant="green" small style={{ flex: 1 }} onPress={() => review(x._id, "approved")} />
                      <Btn title="Reject" variant="danger" small style={{ flex: 1 }} onPress={() => review(x._id, "rejected")} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={ls.none}>
            <Text style={ls.noneText}>0 leave requests</Text>
          </View>
        )}
      </Card>
    </Screen>
  );
}

const ls = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: u(22) },
  gridItem: { width: "48.6%" },
  card: { marginTop: u(38), borderRadius: u(14), paddingHorizontal: u(30), paddingTop: u(26), paddingBottom: u(28) },
  h3: { fontFamily: F.s, fontSize: fs(27), color: "#000" },
  sub: { fontFamily: F.r, fontSize: fs(22), color: "#111", marginTop: u(4) },
  refresh: { flexDirection: "row", alignItems: "center", gap: u(10), borderWidth: 2, borderColor: C.fieldLine, borderRadius: u(10), paddingHorizontal: u(14), height: u(58), backgroundColor: "#f8fbff" },
  refreshText: { fontFamily: F.s, fontSize: fs(19), color: C.blueText },
  none: { marginTop: u(24), backgroundColor: "#f4f8fc", borderWidth: 1, borderColor: "#dde6f3", borderRadius: u(10), paddingVertical: u(16), alignItems: "center" },
  noneText: { fontFamily: F.r, fontSize: fs(18), color: "#333" },
  item: { borderWidth: 1, borderColor: "#e6ebf5", borderRadius: u(12), padding: u(18) },
  itemTitle: { flex: 1, fontFamily: F.s, fontSize: fs(24), color: "#000" },
});
