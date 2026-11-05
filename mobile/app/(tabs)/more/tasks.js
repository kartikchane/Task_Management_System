import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import api, { attachmentUrl, errMsg, escapeRegex } from "../../../src/api";
import { IMAGES } from "../../../src/assets";
import { useAuth } from "../../../src/auth";
import { openUrl, pickFile, uploadFile } from "../../../src/files";
import { toast } from "../../../src/toast";
import { BackHeader, Screen } from "../../../src/components/layout";
import { Toolbar } from "../../../src/components/toolbar";
import { Btn, Card, DateChip, Dialog, Empty, Loading, Pill, ProgressBar, TextField } from "../../../src/components/ui";
import { C, F, fs, u } from "../../../src/theme";
import { dateTime, label, shortDate, statusTone } from "../../../src/utils";

const STATUSES = [
  { value: "", label: "All statuses" },
  ...["pending", "in-progress", "submitted", "completed", "overdue", "not-applicable"].map((v) => ({ value: v, label: label(v) })),
];
const prioTone = { critical: "red", high: "orange", medium: "muted", low: "muted" };

// Screen-14: My Tasks (additional tasks)
export default function Tasks() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(params.search || "");
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState(null);
  useEffect(() => setSearch(params.search || ""), [params.search]);
  const load = useCallback(
    () =>
      api
        .get("/tasks", { params: { status, search: escapeRegex(search.trim()), limit: 100 } })
        .then((r) => {
          setRows(r.data.items);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load tasks"))),
    [status, search],
  );
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(load, 250);
      return () => clearTimeout(t);
    }, [load]),
  );
  return (
    <Screen
      header={<BackHeader bold title={user.role === "employee" ? "My Tasks" : "Task Management"} subtitle="Assign, execute, submit and review work in one live workflow." right={<DateChip style={{ maxWidth: "56%", marginTop: u(6) }} />} />}
      onRefresh={load}
    >
      <Card style={ts.panel}>
        <Toolbar search={search} setSearch={setSearch} placeholder="Search tasks" status={status} setStatus={setStatus} statuses={STATUSES} onRefresh={load} />
        {error ? (
          <Empty title="Unable to load tasks" text={error} style={{ marginTop: u(28) }} />
        ) : !rows ? (
          <Loading />
        ) : rows.length ? (
          <View style={{ gap: u(18), marginTop: u(28) }}>
            {rows.map((x) => (
              <Pressable key={x._id} onPress={() => setOpenId(x._id)} style={({ pressed }) => [ts.task, pressed && { backgroundColor: "#f7f9ff" }]}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Pill text={x.priority} tone={prioTone[x.priority]} />
                  <Pill text={x.status} tone={statusTone[x.status] || "muted"} />
                  <View style={{ flex: 1 }} />
                  {!!x.project?.code && <Text style={ts.small}>{x.project.code}</Text>}
                </View>
                <Text style={ts.title}>{x.title}</Text>
                {!!x.description && (
                  <Text style={ts.desc} numberOfLines={2}>
                    {x.description}
                  </Text>
                )}
                <ProgressBar value={x.progress || 0} style={{ marginVertical: u(16) }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={ts.small}>📅 {shortDate(x.dueDate)}</Text>
                  <Text style={ts.small}>
                    💬 {x.comments?.length || 0} 📎 {x.attachments?.length || 0}
                    {user.role !== "employee" && x.assignedTo?.name ? `  · ${x.assignedTo.name}` : ""}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Empty image={IMAGES.emptyFolder} title="No tasks found" text="Tasks matching your filters will appear here." style={{ marginTop: u(28) }} />
        )}
      </Card>
      {openId && <TaskDialog id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </Screen>
  );
}

function TaskDialog({ id, onClose, onChanged }) {
  const { user } = useAuth();
  const [t, setT] = useState(null);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState("");
  const refresh = useCallback(
    () =>
      api
        .get("/tasks/" + id)
        .then((r) => {
          setT(r.data);
          setProgress(Number(r.data.progress) || 0);
        })
        .catch((e) => {
          toast.error(errMsg(e, "Unable to open task"));
          onClose();
        }),
    [id, onClose],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);
  if (!t) return null;
  const mine = String(t.assignedTo?._id || t.assignedTo) === String(user.id || user._id);
  const canWork = mine && !["completed", "not-applicable", "submitted"].includes(t.status);
  const act = async (key, fn, ok) => {
    setBusy(key);
    try {
      await fn();
      if (ok) toast.success(ok);
      await refresh();
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Something went wrong"));
    } finally {
      setBusy("");
    }
  };
  return (
    <Dialog visible onClose={onClose} title={t.title}>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Pill text={t.status} tone={statusTone[t.status] || "muted"} />
        <Pill text={`${t.priority} priority`} tone={prioTone[t.priority]} />
      </View>
      <Text style={[ts.small, { marginTop: 8 }]}>
        Due {shortDate(t.dueDate)} · {t.assignedTo?.name || ""}
        {t.project?.name ? ` · ${t.project.name}` : ""}
      </Text>
      {!!t.description && <Text style={[ts.desc, { marginTop: 10, color: "#222" }]}>{t.description}</Text>}
      {t.status === "in-progress" && !!t.reviewNote && (
        <View style={ts.warn}>
          <Text style={ts.warnText}>Changes requested: {t.reviewNote}</Text>
        </View>
      )}
      <Text style={ts.label}>Progress {progress}%</Text>
      {canWork ? (
        <Slider
          style={{ height: 34 }}
          minimumValue={0}
          maximumValue={100}
          step={5}
          value={progress}
          onValueChange={(v) => setProgress(Math.round(v))}
          onSlidingComplete={(v) => act("p", () => api.patch(`/tasks/${t._id}/progress`, { progress: Math.round(v) }))}
          minimumTrackTintColor="#0886e1"
          maximumTrackTintColor="#d9d9f5"
          thumbTintColor="#1050f4"
        />
      ) : (
        <ProgressBar value={progress} />
      )}
      {!!t.submissionNote && (
        <>
          <Text style={ts.label}>Submission note</Text>
          <Text style={ts.note}>{t.submissionNote}</Text>
        </>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {t.attachments?.map((a) => (
          <Pressable key={a._id} onPress={() => openUrl(attachmentUrl(a))} style={ts.file}>
            <Ionicons name="attach" size={16} color="#1a3a9a" />
            <Text style={ts.fileText} numberOfLines={1}>
              {a.name}
            </Text>
          </Pressable>
        ))}
        {canWork && (
          <Pressable
            style={ts.attach}
            onPress={async () => {
              const f = await pickFile();
              if (f) act("a", () => uploadFile(`/tasks/${t._id}/attachments`, f), "File uploaded");
            }}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#1a3a9a" />
            <Text style={ts.fileText}>{busy === "a" ? "Uploading..." : "Attach file"}</Text>
          </Pressable>
        )}
      </View>
      {canWork && (
        <>
          <Text style={ts.label}>Submit for review</Text>
          <TextField multiline value={note} onChangeText={setNote} placeholder="Submission note for your manager (optional)" />
          <Btn title="Submit for review" icon="send" variant="navy" small style={{ marginTop: 10 }} loading={busy === "s"} onPress={() => act("s", () => api.post(`/tasks/${t._id}/submit`, { note }), "Task submitted for review")} />
        </>
      )}
      {user.role !== "employee" && t.status === "submitted" && (
        <>
          <Text style={ts.label}>Review</Text>
          <TextField multiline value={note} onChangeText={setNote} placeholder="Feedback for the employee" />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Btn title="Approve" variant="green" small style={{ flex: 1 }} loading={busy === "ok"} onPress={() => act("ok", () => api.post(`/tasks/${t._id}/review`, { decision: "approved", note }), "Task approved")} />
            <Btn
              title="Request changes"
              variant="orange"
              small
              style={{ flex: 1.3 }}
              disabled={!!busy}
              onPress={() => (note.trim() ? act("rw", () => api.post(`/tasks/${t._id}/review`, { decision: "rework", note }), "Changes requested") : toast.error("Write what needs to change"))}
            />
          </View>
        </>
      )}
      <Text style={ts.label}>Comments</Text>
      {t.comments?.length ? (
        t.comments.map((c) => (
          <View key={c._id} style={ts.comment}>
            <Text style={[ts.desc, { fontFamily: F.s, color: "#111" }]}>{c.author?.name}</Text>
            <Text style={[ts.desc, { color: "#111" }]}>{c.text}</Text>
          </View>
        ))
      ) : (
        <Text style={ts.small}>No comments yet.</Text>
      )}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <TextInput value={comment} onChangeText={setComment} placeholder="Write a comment..." placeholderTextColor="#9a9ca3" style={ts.commentInput} />
        <Btn
          title="Send"
          small
          onPress={() =>
            comment.trim() &&
            act("c", async () => {
              await api.post(`/tasks/${t._id}/comments`, { text: comment.trim() });
              setComment("");
            })
          }
        />
      </View>
      {t.history?.length > 0 && (
        <>
          <Text style={ts.label}>History</Text>
          {t.history
            .slice(-6)
            .reverse()
            .map((h, i) => (
              <Text key={i} style={[ts.small, { marginBottom: 4 }]}>
                • {h.message || h.action} — {dateTime(h.at || h.createdAt)}
              </Text>
            ))}
        </>
      )}
    </Dialog>
  );
}

const ts = StyleSheet.create({
  panel: { padding: u(12), paddingBottom: u(20), borderRadius: u(18) },
  task: { borderWidth: 1, borderColor: "#e6ebf5", borderRadius: u(16), padding: u(24) },
  title: { fontFamily: F.s, fontSize: fs(27), color: "#000", marginTop: u(14) },
  desc: { fontFamily: F.r, fontSize: fs(21), color: C.muted, marginTop: u(4) },
  small: { fontFamily: F.r, fontSize: fs(20), color: C.muted },
  label: { fontFamily: F.s, fontSize: 14, color: "#000", marginTop: 16, marginBottom: 6 },
  note: { fontFamily: F.r, fontSize: 13, color: "#222", backgroundColor: "#f7f8fc", borderRadius: 10, padding: 10, lineHeight: 19 },
  warn: { marginTop: 10, backgroundColor: "#fff7ed", borderColor: "#fed7aa", borderWidth: 1, borderRadius: 10, padding: 10 },
  warnText: { fontFamily: F.r, fontSize: 13, color: "#9a3412" },
  file: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.fieldBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, maxWidth: "100%" },
  attach: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderStyle: "dashed", borderColor: "#9fb2e6", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  fileText: { fontFamily: F.m, fontSize: 12.5, color: "#1a3a9a", flexShrink: 1 },
  comment: { backgroundColor: "#f7f8fc", borderRadius: 10, padding: 10, marginTop: 8 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: "#e0e0e8", borderRadius: 10, paddingHorizontal: 12, minHeight: 42, fontFamily: F.r, fontSize: 14, outlineStyle: "none" },
});
