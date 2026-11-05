import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api, { errMsg } from "../../../src/api";
import { toast } from "../../../src/toast";
import { BackHeader, Screen } from "../../../src/components/layout";
import { Btn, Card, Check, Divider, Empty, Field, Icon, Loading, Pill, Select, TextField } from "../../../src/components/ui";
import { C, F, fs, shadow, u } from "../../../src/theme";
import { confirm, label } from "../../../src/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EMPTY = { title: "", department: "", description: "", cadence: "daily", priority: "medium", workingDays: [1, 2, 3, 4, 5, 6], monthlyDay: "1", assigneeMode: "selected", employees: [], tasksText: "", rotation: false };
// "1. Check stock" -> "Check stock"
const parseTasks = (text) =>
  text
    .split("\n")
    .map((l) => l.replace(/^\s*(day\s*)?\d+[.):-]?\s*/i, "").trim())
    .filter(Boolean);

// Screen-17: Recurring Task Templates (managers)
export default function Templates() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [deps, setDeps] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const load = useCallback(
    () =>
      Promise.all([api.get("/daily-templates"), api.get("/departments"), api.get("/daily-work/employees")])
        .then(([a, b, c]) => {
          setRows(a.data);
          setDeps(b.data);
          setEmployees(c.data);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load templates"))),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const save = async () => {
    if (!f.title.trim() || !f.department) return toast.error("Enter a template name and choose a department");
    if (f.assigneeMode === "selected" && !f.employees.length) return toast.error("Select at least one employee");
    const checklist = parseTasks(f.tasksText);
    const payload = {
      title: f.title.trim(),
      department: f.department,
      description: f.description,
      cadence: f.cadence,
      priority: f.priority,
      workingDays: f.workingDays,
      monthlyDay: Number(f.monthlyDay) || 1,
      assigneeMode: f.assigneeMode,
      employees: f.assigneeMode === "selected" ? f.employees : [],
      checklist,
      rotation: f.rotation,
    };
    setBusy(true);
    try {
      if (editing) await api.patch(`/daily-templates/${editing}`, payload);
      else await api.post("/daily-templates", payload);
      toast.success(editing ? "Template updated" : checklist.length > 1 ? `Template created with ${checklist.length} daily tasks` : "Template created");
      setF({ ...EMPTY, department: f.department });
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errMsg(e, "Unable to save template"));
    } finally {
      setBusy(false);
    }
  };
  const edit = (x) => {
    setEditing(x._id);
    setF({
      title: x.title || "",
      department: x.department?._id || x.department || "",
      description: x.description || "",
      cadence: x.cadence || "daily",
      priority: x.priority || "medium",
      workingDays: x.workingDays?.length ? x.workingDays : [1, 2, 3, 4, 5, 6],
      monthlyDay: String(x.monthlyDay || 1),
      assigneeMode: x.assigneeMode || "selected",
      employees: (x.employees || []).map((e) => e._id || e),
      tasksText: (x.checklist || []).join("\n"),
      rotation: !!x.rotation,
    });
    toast("Editing \"" + x.title + "\" — scroll up to the form");
  };
  const remove = async (x) => {
    if (!(await confirm("Delete template", "Already generated tasks stay as they are.", "Delete", true))) return;
    try {
      await api.delete(`/daily-templates/${x._id}`);
      toast.success("Template removed");
      load();
    } catch (e) {
      toast.error(errMsg(e, "Unable to delete template"));
    }
  };
  const toggle = async (x) => {
    try {
      await api.patch(`/daily-templates/${x._id}`, { active: !x.active });
      load();
    } catch (e) {
      toast.error(errMsg(e, "Unable to update template"));
    }
  };
  const generate = async () => {
    try {
      const r = await api.post("/daily-templates/generate", {});
      toast.success(`${r.data.message} (${r.data.created})`);
    } catch (e) {
      toast.error(errMsg(e, "Unable to generate daily work"));
    }
  };
  const deptEmployees = employees.filter((e) => !f.department || String(e.department?._id || e.department) === String(f.department));

  return (
    <Screen
      header={
        <BackHeader
          bold
          title={"Recurring Task\nTemplates"}
          subtitle="Store an employee's standing daily tasks once — every working day they're assigned automatically in Daily Work."
          right={
            <Pressable onPress={generate} style={ts.generate}>
              <Icon name="calendar" size={u(34)} color={C.blueText} />
              <Text style={ts.generateText}>Generate{"\n"}today</Text>
            </Pressable>
          }
        />
      }
      onRefresh={load}
      keyboard
    >
      <Card style={ts.card}>
        {editing && (
          <View style={ts.editing}>
            <Text style={ts.editingText}>Editing a template</Text>
            <Pressable
              onPress={() => {
                setEditing(null);
                setF(EMPTY);
              }}
            >
              <Text style={[ts.editingText, { textDecorationLine: "underline" }]}>Cancel</Text>
            </Pressable>
          </View>
        )}
        <Field label="Template name (internal label)" style={{ marginTop: 0 }}>
          <TextField value={f.title} onChangeText={set("title")} placeholder="e.g. Monica - HR daily tasks" />
        </Field>
        <Field label="Department">
          <Select value={f.department} onChange={(v) => setF((x) => ({ ...x, department: v, employees: [] }))} placeholder="Select department" title="Department" options={deps.map((d) => ({ value: d._id, label: d.name }))} />
        </Field>
        <Field label="Assign to">
          <Select
            value={f.assigneeMode}
            onChange={set("assigneeMode")}
            title="Assign to"
            options={[
              { value: "selected", label: "Specific employee(s)" },
              { value: "department", label: "Everyone in the department" },
            ]}
          />
        </Field>
        {f.assigneeMode === "selected" && (
          <Field label="Employees">
            <Select multiple value={f.employees} onChange={set("employees")} placeholder={f.department ? "Select employees" : "Choose a department first"} title="Employees" options={deptEmployees.map((e) => ({ value: e._id, label: e.name }))} />
          </Field>
        )}
        <Field label="Frequency">
          <Select value={f.cadence} onChange={set("cadence")} options={["daily", "weekly", "monthly"]} title="Frequency" />
        </Field>
        <Field label="Priority">
          <Select value={f.priority} onChange={set("priority")} options={["low", "medium", "high", "critical"]} title="Priority" />
        </Field>
        {f.cadence === "monthly" ? (
          <Field label="Day of the month">
            <TextField value={f.monthlyDay} onChangeText={set("monthlyDay")} keyboardType="number-pad" placeholder="1" />
          </Field>
        ) : (
          <Field label="Working days" hint="Tap the days this task should appear on. All working days are selected by default.">
            <Select
              multiple
              value={f.workingDays}
              onChange={(v) => set("workingDays")(v.length ? v : f.workingDays)}
              title="Working days"
              options={DAYS.map((d, i) => ({ value: i, label: d }))}
            />
          </Field>
        )}
        <Field label="Description (optional, applies to every task below)">
          <TextField multiline minHeight={u(64)} value={f.description} onChangeText={set("description")} />
        </Field>
        <Check checked={f.rotation} onChange={set("rotation")} style={{ marginTop: u(34), alignItems: "flex-start" }}>
          <Text style={ts.check}>
            <Text style={{ fontFamily: F.b }}>Rotate one task per day</Text> — task 1 on the first working day, task 2 on the next, and so on (instead of showing every task every day)
          </Text>
        </Check>
        <Field label="Daily tasks - one per line" hint="Paste the employee's standing daily responsibilities, one per line (numbering like '1.' is removed automatically). Leave blank to use the template name as a single task.">
          <TextField multiline minHeight={u(106)} value={f.tasksText} onChangeText={set("tasksText")} placeholder={"Check job portals and collect suitable CVs\nSource CVs for Sales Executive positions\nMaintain and update the interview tracker\n..."} />
        </Field>
        <Divider style={{ marginTop: u(36) }} />
        <Btn title={editing ? "Save Template" : "Create Template"} icon="diskette" loading={busy} onPress={save} style={{ alignSelf: "flex-end", marginTop: u(34) }} small />
      </Card>

      <Card style={ts.countBar}>
        <Text style={ts.count}>{rows ? rows.length : 0} templates</Text>
        <Pressable onPress={load} style={ts.refresh}>
          <Ionicons name="refresh" size={u(34)} color="#2f5bd0" />
          <Text style={ts.refreshText}>Refresh</Text>
        </Pressable>
      </Card>
      {error ? (
        <Empty title="Unable to load templates" text={error} />
      ) : !rows ? (
        <Loading color="#fff" />
      ) : rows.length ? (
        <View style={{ gap: u(18), marginTop: u(16) }}>
          {rows.map((x) => (
            <Card key={x._id} style={{ padding: u(24) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={ts.tTitle} numberOfLines={2}>
                  {x.title}
                </Text>
                <Pill text={x.active ? "active" : "paused"} tone={x.active ? "green" : "muted"} />
              </View>
              <Text style={ts.tMeta}>
                {label(x.cadence)} · {label(x.priority)} · {x.department?.name || ""}
              </Text>
              <Text style={ts.tMeta}>
                {x.assigneeMode === "department" ? "Everyone in the department" : (x.employees || []).map((e) => e.name).join(", ") || "No employees"}
              </Text>
              {x.checklist?.length > 0 && (
                <Text style={ts.tMeta} numberOfLines={3}>
                  {x.checklist.length} task{x.checklist.length > 1 ? "s" : ""}: {x.checklist.join(" · ")}
                </Text>
              )}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Btn title="Edit" variant="outline" small onPress={() => edit(x)} style={{ flex: 1 }} />
                <Btn title={x.active ? "Pause" : "Resume"} variant="outline" small onPress={() => toggle(x)} style={{ flex: 1 }} />
                <Btn title="Delete" variant="danger" small onPress={() => remove(x)} style={{ flex: 1 }} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Empty title="No recurring templates" text="Create a daily, weekly or monthly template to start automatic work generation." style={{ marginTop: u(16) }} />
      )}
    </Screen>
  );
}

const ts = StyleSheet.create({
  generate: { flexDirection: "row", alignItems: "center", gap: u(10), backgroundColor: "#fcfcfc", borderWidth: 2, borderColor: "#8fd8ff", borderRadius: u(12), paddingHorizontal: u(14), paddingVertical: u(8), marginTop: u(14), ...shadow },
  generateText: { fontFamily: F.s, fontSize: fs(21), color: C.blueText, lineHeight: u(28) },
  card: { borderRadius: u(18), paddingHorizontal: u(32), paddingTop: u(40), paddingBottom: u(32) },
  editing: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#eef3ff", borderRadius: 10, padding: 10, marginBottom: 14 },
  editingText: { fontFamily: F.m, fontSize: 13, color: C.navy },
  check: { fontFamily: F.r, fontSize: fs(22), color: "#000", flex: 1, lineHeight: u(32) },
  countBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: u(14), paddingHorizontal: u(30), paddingVertical: u(18), borderRadius: u(18) },
  count: { fontFamily: F.m, fontSize: fs(26), color: "#000" },
  refresh: { flexDirection: "row", alignItems: "center", gap: u(10), borderWidth: 2, borderColor: C.fieldLine, borderRadius: u(10), paddingHorizontal: u(14), height: u(58), backgroundColor: "#f8fbff" },
  refreshText: { fontFamily: F.s, fontSize: fs(19), color: C.blueText },
  tTitle: { flex: 1, fontFamily: F.s, fontSize: fs(26), color: "#000" },
  tMeta: { fontFamily: F.r, fontSize: fs(20), color: "#555", marginTop: 4 },
});
