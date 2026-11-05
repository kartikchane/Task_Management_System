import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import api, { attachmentUrl, errMsg } from "../../src/api";
import { IMAGES } from "../../src/assets";
import { useAuth } from "../../src/auth";
import { openUrl, pickFile, uploadFile } from "../../src/files";
import { store } from "../../src/storage";
import { toast } from "../../src/toast";
import { PageTitle, Screen, TopBar } from "../../src/components/layout";
import { Btn, Card, Check, DateField, Dialog, Empty, Field, Icon, Loading, Pill, ProgressBar, Select, StatCard, TextField } from "../../src/components/ui";
import { C, F, fs, u } from "../../src/theme";
import { confirm, dateTime, label, statusTone, todayIso } from "../../src/utils";

const locked = (s) => ["submitted", "approved"].includes(s);

// The form fields are saved inside the task's one submission note under these headings
// (exactly the same as the website, so the manager sees the same thing on both).
const HEADINGS = { work: "Work completed today:", blockers: "Blockers / support needed:", plan: "Plan for tomorrow:", note: "Note:" };
const composeNote = (f) =>
  Object.entries(HEADINGS)
    .map(([k, h]) => (f[k]?.trim() ? `${h}\n${f[k].trim()}` : null))
    .filter(Boolean)
    .join("\n\n");
function parseNote(text = "") {
  const out = { work: "", blockers: "", plan: "", note: "" };
  if (!text) return out;
  const keys = Object.keys(HEADINGS);
  let cur = null,
    found = false;
  for (const line of text.split("\n")) {
    const k = keys.find((key) => line.trim() === HEADINGS[key]);
    if (k) {
      cur = k;
      found = true;
    } else if (cur) out[cur] += (out[cur] ? "\n" : "") + line;
  }
  if (!found) out.work = text;
  keys.forEach((k) => (out[k] = out[k].trim()));
  return out;
}
const draftKey = (id) => "tf_daily_draft_" + id;

// Screen-6: Daily Work. Employees fill their update; managers also get the team monitor.
export default function DailyWork() {
  const { user } = useAuth();
  const [tab, setTab] = useState(user.role === "superadmin" ? "team" : user.role === "admin" ? "team" : "mine");
  if (user.role === "employee") return <MyDailyWork />;
  return user.role === "superadmin" ? <TeamDailyWork /> : tab === "team" ? <TeamDailyWork tab={tab} setTab={setTab} /> : <MyDailyWork tab={tab} setTab={setTab} />;
}

function Segments({ tab, setTab }) {
  if (!setTab) return null;
  return (
    <View style={ws.segments}>
      {[
        ["team", "Team monitor"],
        ["mine", "My daily tasks"],
      ].map(([k, l]) => (
        <Pressable key={k} onPress={() => setTab(k)} style={[ws.segment, tab === k && ws.segmentOn]}>
          <Text style={[ws.segmentText, tab === k && { color: "#fff" }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ================= employee: today's tasks ================= */
function MyDailyWork({ tab, setTab }) {
  const [row, setRow] = useState(null);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const load = useCallback(
    () =>
      api
        .get("/daily-work/today")
        .then((r) => {
          setRow(r.data);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load daily work"))),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = (row?.assignedTasks || []).map((t) => ({ ...t, workId: row._id, date: row.date, overdue: false }));
  const overdue = (row?.overdueTasks || []).map((t) => ({ ...t, overdue: true }));
  const all = [...overdue, ...today];
  const active = all.find((t) => t._id === activeId) || all.find((t) => !locked(t.status)) || all[0];

  const toggleGenerated = async (id, done) => {
    try {
      const { data } = await api.patch(`/daily-work/today/generated-tasks/${id}`, { done });
      setRow((prev) => ({ ...data, overdueTasks: prev.overdueTasks }));
    } catch (e) {
      toast.error(errMsg(e, "Unable to update checklist item"));
    }
  };

  return (
    <Screen header={<TopBar />} onRefresh={load} keyboard>
      <PageTitle title="Daily Work Update" subtitle="Complete the tasks assigned to you today, attach proof and submit each one for review." />
      <Segments tab={tab} setTab={setTab} />
      {overdue.length > 0 && (
        <View style={ws.warn}>
          <Ionicons name="alert-circle" size={20} color="#9a3412" />
          <Text style={ws.warnText}>
            {overdue.length} overdue task{overdue.length > 1 ? "s" : ""} from previous days. Pick them below, complete and submit them.
          </Text>
        </View>
      )}
      <Card style={ws.panel}>
        {error ? (
          <Empty title="Unable to load daily work" text={error} />
        ) : !row ? (
          <Loading />
        ) : !all.length ? (
          <Empty image={IMAGES.emptyFolder} title="No tasks assigned for today" text="Your admin/manager will assign your daily tasks here." />
        ) : (
          <>
            {all.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: u(14), paddingBottom: u(18) }}>
                {all.map((t) => (
                  <Pressable key={t._id} onPress={() => setActiveId(t._id)} style={[ws.tab, t._id === active?._id && ws.tabOn]}>
                    <View style={[ws.tabDot, { backgroundColor: t.overdue ? "#e5141b" : dotColor[t.status] || "#b9bfd0" }]} />
                    <Text style={ws.tabText} numberOfLines={1}>
                      {t.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <TaskForm key={active._id} task={active} reload={load} />
          </>
        )}
      </Card>
      {row?.generatedTasks?.length > 0 && (
        <Card style={[ws.panel, { marginTop: u(28), padding: u(30) }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={ws.h3}>Recurring responsibilities</Text>
            <Text style={ws.h3}>
              {row.generatedTasks.filter((x) => x.done).length}/{row.generatedTasks.length}
            </Text>
          </View>
          <Text style={ws.small}>Generated automatically from your daily / weekly / monthly templates.</Text>
          <View style={{ gap: u(18), marginTop: u(20) }}>
            {row.generatedTasks.map((t) => (
              <Check key={t._id} checked={t.done} onChange={(v) => toggleGenerated(t._id, v)}>
                <Text style={[ws.body, t.done && { textDecorationLine: "line-through", opacity: 0.6 }]}>{t.title}</Text>
              </Check>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}
const dotColor = { "in-progress": "#0886e1", submitted: "#7c3aed", approved: "#179760", rework: "#e5141b" };

function TaskForm({ task, reload }) {
  const isLocked = locked(task.status);
  const [progress, setProgress] = useState(task.progress || 0);
  const [f, setF] = useState(parseNote(task.submissionNote));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const saved = useRef(task.progress || 0);
  const path = `/daily-work/tasks/${task.workId}/${task._id}`;

  useEffect(() => {
    store.getJSON(draftKey(task._id)).then((d) => d && setF(d));
  }, [task._id]);
  const saveProgress = async (value) => {
    if (isLocked || value === saved.current) return true;
    try {
      await api.patch(`${path}/progress`, { progress: value });
      saved.current = value;
      reload();
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Unable to update progress"));
      return false;
    }
  };
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const saveDraft = async () => {
    await store.setJSON(draftKey(task._id), f);
    if (await saveProgress(progress)) toast.success("Progress saved");
  };
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`${path}/submit`, { note: composeNote(f) });
      await store.set(draftKey(task._id), null);
      toast.success("Daily update submitted to your manager");
      reload();
    } catch (e) {
      toast.error(errMsg(e, "Unable to submit task"));
    } finally {
      setBusy(false);
    }
  };
  const attach = async () => {
    const file = await pickFile();
    if (!file) return;
    setUploading(true);
    try {
      await uploadFile(`${path}/attachments`, file);
      toast.success("File uploaded");
      reload();
    } catch (e) {
      toast.error(errMsg(e, "Unable to upload file"));
    } finally {
      setUploading(false);
    }
  };
  const sendComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`${path}/comments`, { text: comment.trim() });
      setComment("");
      reload();
    } catch (e) {
      toast.error(errMsg(e, "Unable to add comment"));
    }
  };
  const eyebrow = task.overdue ? `OVERDUE TASK · ${task.date}` : task.template ? "TODAY'S FIXED TASK" : "TODAY'S TASK";
  const status = task.status === "todo" ? "pending" : task.status || "pending";

  return (
    <View>
      <View style={ws.head}>
        <View style={ws.headIcon}>
          <Icon name="checklist" size={u(50)} color="#7419ee" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[ws.eyebrow, task.overdue && { color: "#c11b1b" }]} numberOfLines={1}>
              {eyebrow}
            </Text>
            <View style={{ flex: 1 }} />
            <View style={[ws.status, statusBg[status]]}>
              <Text style={[ws.statusText, statusFg[status]]}>{label(status)}</Text>
            </View>
          </View>
          <Text style={ws.title}>{task.title}</Text>
          <Text style={ws.desc}>
            {task.description || "Record completed work, blockers and the next-day plan. This update is visible to your Manager and Super Admin."}
          </Text>
          <Text style={ws.meta}>
            Due {task.dueTime || "—"} · {label(task.priority)} priority · By {task.assignedBy?.name || "Manager"}
          </Text>
        </View>
      </View>
      {task.status === "rework" && (
        <View style={[ws.warn, { marginTop: u(16), marginBottom: 0 }]}>
          <Ionicons name="alert-circle" size={20} color="#9a3412" />
          <Text style={ws.warnText}>
            <Text style={{ fontFamily: F.s }}>Changes requested: </Text>
            {task.reviewNote || "Please update and resubmit this task."}
          </Text>
        </View>
      )}
      {task.status === "approved" && (
        <View style={[ws.ok, { marginTop: u(16) }]}>
          <Ionicons name="checkmark-circle" size={20} color="#166534" />
          <Text style={ws.okText}>
            <Text style={{ fontFamily: F.s }}>Task approved. </Text>
            {task.reviewNote || ""}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: u(26) }}>
        <View style={{ flex: 1 }}>
          <Text style={ws.h3b}>Progress</Text>
          <Text style={ws.small}>Keep this updated during the day.</Text>
        </View>
        <Text style={ws.percent}>{progress}%</Text>
      </View>
      <Slider
        style={{ height: 34, marginHorizontal: Platform.OS === "android" ? -12 : 0 }}
        minimumValue={0}
        maximumValue={100}
        step={5}
        value={progress}
        disabled={isLocked}
        onValueChange={(v) => setProgress(Math.round(v))}
        onSlidingComplete={(v) => saveProgress(Math.round(v))}
        minimumTrackTintColor="#0886e1"
        maximumTrackTintColor="#d9d9f5"
        thumbTintColor="#1050f4"
      />

      {isLocked ? (
        <View style={{ marginTop: u(16) }}>
          <Text style={ws.label}>Your submitted update</Text>
          <Text style={ws.submitted}>{task.submissionNote || "No note added."}</Text>
          {!!task.submittedAt && <Text style={[ws.small, { marginTop: 6 }]}>Submitted {dateTime(task.submittedAt)}</Text>}
        </View>
      ) : (
        <>
          <Field label="Work completed today" style={{ marginTop: u(20) }}>
            <TextField multiline minHeight={u(100)} value={f.work} onChangeText={set("work")} placeholder="Explain tasks completed, modules worked on, fixes, testing and outcomes..." />
          </Field>
          <Field label="Blockers / support needed">
            <TextField multiline minHeight={u(72)} value={f.blockers} onChangeText={set("blockers")} placeholder="Mention blockers, dependencies or write None" />
          </Field>
          <Field label="Plan for tomorrow">
            <TextField multiline minHeight={u(72)} value={f.plan} onChangeText={set("plan")} placeholder="What will you continue or start tomorrow?" />
          </Field>
          <Field label="Submission note">
            <TextField value={f.note} onChangeText={set("note")} placeholder="Optional short note for your manager" />
          </Field>
        </>
      )}

      {(task.attachments?.length > 0 || !isLocked) && (
        <View style={ws.files}>
          {task.attachments?.map((a) => (
            <Pressable key={a._id} onPress={() => openUrl(attachmentUrl(a))} style={ws.file}>
              <Ionicons name="attach" size={16} color="#1a3a9a" />
              <Text style={ws.fileText} numberOfLines={1}>
                {a.name}
              </Text>
            </Pressable>
          ))}
          {!isLocked && (
            <Pressable onPress={attach} style={ws.attach} disabled={uploading}>
              <Ionicons name="cloud-upload-outline" size={17} color="#1a3a9a" />
              <Text style={ws.fileText}>{uploading ? "Uploading..." : "Attach proof"}</Text>
            </Pressable>
          )}
        </View>
      )}

      {!isLocked && (
        <View style={ws.buttons}>
          <Btn title="Save progress" variant="outlineNavy" icon="diskette" onPress={saveDraft} style={{ flex: 1 }} small />
          <Btn title="Submit daily update" variant="navy" icon="send" onPress={submit} loading={busy} style={{ flex: 1.25 }} small />
        </View>
      )}

      <Pressable onPress={() => setShowComments((v) => !v)} style={ws.commentsHead}>
        <Text style={ws.h3b}>Comments ({task.comments?.length || 0})</Text>
        <Ionicons name={showComments ? "chevron-up" : "chevron-down"} size={18} color="#333" />
      </Pressable>
      {showComments && (
        <View>
          {task.comments?.length ? (
            task.comments.map((c) => (
              <View key={c._id} style={ws.comment}>
                <Text style={[ws.body, { fontFamily: F.s }]}>{c.author?.name}</Text>
                <Text style={ws.body}>{c.text}</Text>
              </View>
            ))
          ) : (
            <Text style={ws.small}>No comments yet.</Text>
          )}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <TextInput value={comment} onChangeText={setComment} placeholder="Write a comment for your manager..." placeholderTextColor="#9a9ca3" style={[ws.commentInput]} />
            <Btn title="Send" small onPress={sendComment} />
          </View>
        </View>
      )}
    </View>
  );
}
const statusBg = {
  pending: { backgroundColor: "#d3ccff" },
  "in-progress": { backgroundColor: "#d6e9ff" },
  submitted: { backgroundColor: "#e5dcff" },
  approved: { backgroundColor: "#d7f5e7" },
  rework: { backgroundColor: "#ffe1d6" },
};
const statusFg = {
  pending: { color: "#7a4dff" },
  "in-progress": { color: "#075bb5" },
  submitted: { color: "#5b2fd6" },
  approved: { color: "#0b7a4b" },
  rework: { color: "#c2410c" },
};

/* ================= managers: team monitor ================= */
function TeamDailyWork({ tab, setTab }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState("");
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(null); // { row, taskId }
  const [assign, setAssign] = useState(false);
  const load = useCallback(
    () =>
      Promise.all([api.get("/daily-work", { params: { date, status } }), api.get("/daily-work/employees")])
        .then(([a, b]) => {
          setRows(a.data);
          setEmployees(b.data);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load team daily work"))),
    [date, status],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const tasks = (rows || []).flatMap((r) => r.assignedTasks || []);
  const counts = {
    people: new Set((rows || []).map((r) => String(r.employee?._id || r.employee))).size,
    pending: tasks.filter((t) => ["todo", "in-progress", "rework"].includes(t.status)).length,
    submitted: tasks.filter((t) => t.status === "submitted").length,
    approved: tasks.filter((t) => t.status === "approved").length,
  };
  const openRow = open && (rows || []).find((r) => r._id === open.rowId);
  const openTask = openRow?.assignedTasks.find((t) => t._id === open.taskId);

  return (
    <Screen header={<TopBar />} onRefresh={load}>
      <PageTitle
        title="Daily Work Monitor"
        subtitle="Assign daily tasks, review submissions and approve or request changes."
        right={<Btn title="Assign" icon={<Ionicons name="add" size={u(36)} color="#fff" />} small onPress={() => setAssign(true)} style={{ marginTop: u(16) }} />}
      />
      <Segments tab={tab} setTab={setTab} />
      <View style={ws.grid}>
        <StatCard compact label="Employees" value={counts.people} sub="Daily reporting" icon="group" tone="blue" style={ws.gridItem} />
        <StatCard compact label="Pending" value={counts.pending} sub="Daily reporting" icon="clock" tone="green" style={ws.gridItem} />
        <StatCard compact label="Submitted" value={counts.submitted} sub="Daily reporting" icon="send" tone="orange" style={ws.gridItem} />
        <StatCard compact label="Approved" value={counts.approved} sub="Daily reporting" icon="checked" tone="purple" style={ws.gridItem} />
      </View>
      <Card style={[ws.filters]}>
        <DateField value={date} onChange={setDate} style={{ flex: 1 }} compact />
        <Select
          value={status}
          onChange={setStatus}
          compact
          style={{ flex: 1 }}
          title="Status"
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "in-progress", label: "In progress" },
            { value: "submitted", label: "Submitted" },
            { value: "approved", label: "Approved" },
            { value: "rework", label: "Rework" },
          ]}
        />
      </Card>
      {error ? (
        <Empty title="Unable to load" text={error} />
      ) : !rows ? (
        <Loading color="#fff" />
      ) : rows.length ? (
        <View style={{ gap: u(22) }}>
          {rows.map((r) => (
            <Card key={r._id} style={{ padding: u(26) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: u(18) }}>
                <View style={ws.person}>
                  <Text style={ws.personText}>{r.employee?.name?.[0] || "?"}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={ws.h3b} numberOfLines={1}>
                    {r.employee?.name}
                  </Text>
                  <Text style={ws.small} numberOfLines={1}>
                    {r.employee?.designation || "Employee"} · {r.department?.name || ""}
                  </Text>
                </View>
                <Pill text={r.status || "pending"} tone={statusTone[r.status] || "muted"} />
              </View>
              <ProgressBar value={r.progress || 0} style={{ marginVertical: u(18) }} />
              {(r.assignedTasks || []).map((t) => (
                <Pressable key={t._id} onPress={() => setOpen({ rowId: r._id, taskId: t._id })} style={ws.teamTask}>
                  <Text style={[ws.body, { flex: 1 }]} numberOfLines={2}>
                    {t.title}
                  </Text>
                  <Pill text={t.status === "todo" ? "pending" : t.status} tone={statusTone[t.status] || "muted"} />
                  <Ionicons name="chevron-forward" size={16} color="#888" />
                </Pressable>
              ))}
              {!r.assignedTasks?.length && <Text style={ws.small}>No tasks assigned yet.</Text>}
            </Card>
          ))}
        </View>
      ) : (
        <Empty image={IMAGES.emptyFolder} title="No records" text="No employees have daily work for this date and filter." />
      )}
      {openTask && <ReviewDialog row={openRow} task={openTask} onClose={() => setOpen(null)} reload={load} />}
      <AssignDialog visible={assign} onClose={() => setAssign(false)} employees={employees} onDone={load} />
    </Screen>
  );
}

function ReviewDialog({ row, task, onClose, reload }) {
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const path = `/daily-work/tasks/${row._id}/${task._id}`;
  const review = async (decision) => {
    if (decision === "rework" && !note.trim()) return toast.error("Write what needs to change");
    setBusy(true);
    try {
      await api.post(`${path}/review`, { decision, note });
      toast.success(decision === "approved" ? "Task approved" : "Changes requested");
      await reload();
      onClose();
    } catch (e) {
      toast.error(errMsg(e, "Unable to review task"));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!(await confirm("Remove task", "Remove this task from the employee's day?", "Remove", true))) return;
    try {
      await api.delete(path);
      toast.success("Task removed");
      await reload();
      onClose();
    } catch (e) {
      toast.error(errMsg(e, "Unable to remove task"));
    }
  };
  const send = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`${path}/comments`, { text: comment.trim() });
      setComment("");
      reload();
    } catch (e) {
      toast.error(errMsg(e, "Unable to add comment"));
    }
  };
  return (
    <Dialog visible onClose={onClose} title={task.title}>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Pill text={task.status === "todo" ? "pending" : task.status} tone={statusTone[task.status] || "muted"} />
        <Pill text={`${task.priority} priority`} />
      </View>
      <Text style={[ws.small, { marginTop: 8 }]}>
        {row.employee?.name} · Due {task.dueTime} · {row.date}
      </Text>
      {!!task.description && <Text style={[ws.body, { marginTop: 10 }]}>{task.description}</Text>}
      <Text style={[ws.label, { marginTop: 14 }]}>Progress {task.progress || 0}%</Text>
      <ProgressBar value={task.progress || 0} />
      {!!task.submissionNote && (
        <>
          <Text style={[ws.label, { marginTop: 14 }]}>Employee's update</Text>
          <Text style={ws.submitted}>{task.submissionNote}</Text>
        </>
      )}
      {!!task.reviewNote && (
        <>
          <Text style={[ws.label, { marginTop: 14 }]}>Last feedback</Text>
          <Text style={ws.submitted}>{task.reviewNote}</Text>
        </>
      )}
      {task.attachments?.length > 0 && (
        <View style={[ws.files, { paddingTop: 12 }]}>
          {task.attachments.map((a) => (
            <Pressable key={a._id} onPress={() => openUrl(attachmentUrl(a))} style={ws.file}>
              <Ionicons name="attach" size={16} color="#1a3a9a" />
              <Text style={ws.fileText} numberOfLines={1}>
                {a.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {task.status === "submitted" && (
        <>
          <Text style={[ws.label, { marginTop: 14 }]}>Feedback for the employee</Text>
          <TextField multiline value={note} onChangeText={setNote} placeholder="Add feedback (required for changes)" />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Btn title="Approve" variant="green" small style={{ flex: 1 }} loading={busy} onPress={() => review("approved")} />
            <Btn title="Request changes" variant="orange" small style={{ flex: 1.3 }} disabled={busy} onPress={() => review("rework")} />
          </View>
        </>
      )}
      <Text style={[ws.label, { marginTop: 16 }]}>Comments</Text>
      {task.comments?.length ? (
        task.comments.map((c) => (
          <View key={c._id} style={ws.comment}>
            <Text style={[ws.body, { fontFamily: F.s }]}>{c.author?.name}</Text>
            <Text style={ws.body}>{c.text}</Text>
          </View>
        ))
      ) : (
        <Text style={ws.small}>No comments yet.</Text>
      )}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <TextInput value={comment} onChangeText={setComment} placeholder="Write a comment..." placeholderTextColor="#9a9ca3" style={ws.commentInput} />
        <Btn title="Send" small onPress={send} />
      </View>
      {!locked(task.status) && <Btn title="Remove task" variant="danger" small onPress={remove} style={{ marginTop: 16 }} />}
    </Dialog>
  );
}

function AssignDialog({ visible, onClose, employees, onDone }) {
  const empty = { employeeId: "", date: todayIso(), title: "", description: "", dueTime: "18:00", priority: "medium" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!f.employeeId || !f.title.trim()) return toast.error("Choose a person and enter a task title");
    if (!/^\d{2}:\d{2}$/.test(f.dueTime)) return toast.error("Due time must look like 18:00");
    setBusy(true);
    try {
      await api.post("/daily-work/tasks", f);
      toast.success("Task assigned");
      setF(empty);
      onClose();
      onDone();
    } catch (e) {
      toast.error(errMsg(e, "Unable to assign task"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog visible={visible} onClose={onClose} title="Assign daily task">
      <Field label="Assign to" style={{ marginTop: 4 }}>
        <Select
          value={f.employeeId}
          onChange={set("employeeId")}
          placeholder="Select person"
          title="Assign to"
          options={employees.map((e) => ({ value: e._id, label: `${e.name}${e.role === "admin" ? " (Admin)" : ""}` }))}
        />
      </Field>
      <Field label="Date">
        <DateField value={f.date} onChange={set("date")} min={todayIso()} />
      </Field>
      <Field label="Task title">
        <TextField value={f.title} onChangeText={set("title")} placeholder="What needs to be done" />
      </Field>
      <Field label="Description">
        <TextField multiline value={f.description} onChangeText={set("description")} placeholder="Details for the employee (optional)" />
      </Field>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Field label="Due time" style={{ flex: 1 }}>
          <TextField value={f.dueTime} onChangeText={set("dueTime")} placeholder="18:00" keyboardType="numbers-and-punctuation" />
        </Field>
        <Field label="Priority" style={{ flex: 1 }}>
          <Select value={f.priority} onChange={set("priority")} options={["low", "medium", "high", "critical"]} title="Priority" />
        </Field>
      </View>
      <Btn title="Assign task" onPress={save} loading={busy} style={{ marginTop: 18 }} />
    </Dialog>
  );
}

const ws = StyleSheet.create({
  segments: { flexDirection: "row", backgroundColor: "#fff", borderRadius: u(16), padding: u(10), gap: u(10), marginBottom: u(26) },
  segment: { flex: 1, alignItems: "center", paddingVertical: u(14), borderRadius: u(10), borderWidth: 1.5, borderColor: C.fieldLine },
  segmentOn: { backgroundColor: C.primary, borderColor: C.primary },
  segmentText: { fontFamily: F.s, fontSize: fs(23), color: C.blueText },
  panel: { padding: u(18), borderRadius: u(18) },
  warn: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#fff7ed", borderColor: "#fed7aa", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: u(22) },
  warnText: { flex: 1, fontFamily: F.r, fontSize: fs(21), color: "#9a3412" },
  ok: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", borderWidth: 1, borderRadius: 12, padding: 12 },
  okText: { flex: 1, fontFamily: F.r, fontSize: fs(21), color: "#166534" },
  tab: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 2, borderColor: "#e2e6f3", maxWidth: 230 },
  tabOn: { borderColor: "#7c6cf5", backgroundColor: "#ebebfe" },
  tabDot: { width: 8, height: 8, borderRadius: 4 },
  tabText: { fontFamily: F.m, fontSize: fs(21), color: "#1b1f2c", flexShrink: 1 },
  head: { flexDirection: "row", gap: u(22), backgroundColor: "#ebebfe", borderRadius: u(14), padding: u(16), paddingRight: u(20) },
  headIcon: { width: u(78), height: u(78), borderRadius: u(14), borderWidth: 1.5, borderColor: "#7419ee", alignItems: "center", justifyContent: "center", marginTop: u(22) },
  eyebrow: { fontFamily: F.b, fontSize: fs(20), color: "#1d1ef7", flexShrink: 1 },
  status: { paddingHorizontal: u(14), paddingVertical: u(3), borderRadius: u(8) },
  statusText: { fontFamily: F.r, fontSize: fs(18) },
  title: { fontFamily: F.s, fontSize: fs(30), lineHeight: u(42), color: "#000", marginTop: u(4) },
  desc: { fontFamily: F.r, fontSize: fs(21), color: "#000", marginTop: u(4) },
  meta: { fontFamily: F.r, fontSize: fs(18), color: "#4a4f63", marginTop: u(8) },
  h3: { fontFamily: F.m, fontSize: fs(27), color: "#000" },
  h3b: { fontFamily: F.s, fontSize: fs(25), color: "#000" },
  small: { fontFamily: F.r, fontSize: fs(20), color: "#333" },
  body: { fontFamily: F.r, fontSize: fs(22), color: "#111" },
  percent: { fontFamily: F.b, fontSize: fs(21), color: "#000" },
  label: { fontFamily: F.s, fontSize: fs(23), color: "#000", marginBottom: u(10) },
  submitted: { fontFamily: F.r, fontSize: fs(21), color: "#222", backgroundColor: "#f7f8fc", borderRadius: 10, padding: 12, lineHeight: u(32) },
  files: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: u(22) },
  file: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.fieldBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, maxWidth: "100%" },
  attach: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderStyle: "dashed", borderColor: "#9fb2e6", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  fileText: { fontFamily: F.m, fontSize: fs(20), color: "#1a3a9a", flexShrink: 1 },
  buttons: { flexDirection: "row", gap: u(30), marginTop: u(34), justifyContent: "flex-end" },
  commentsHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: C.line, marginTop: u(30), paddingTop: u(22), paddingBottom: u(10) },
  comment: { backgroundColor: "#f7f8fc", borderRadius: 10, padding: 10, marginTop: 8 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: "#e0e0e8", borderRadius: 10, paddingHorizontal: 12, minHeight: 42, fontFamily: F.r, fontSize: 14, outlineStyle: "none" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: u(20) },
  gridItem: { width: "48.6%" },
  filters: { flexDirection: "row", gap: u(16), padding: u(16), marginVertical: u(24) },
  person: { width: u(70), height: u(70), borderRadius: u(16), backgroundColor: "#e8ecf8", alignItems: "center", justifyContent: "center" },
  personText: { fontFamily: F.s, fontSize: fs(28), color: C.navy },
  teamTask: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: u(14), borderTopWidth: 1, borderTopColor: "#f0f0f0" },
});
