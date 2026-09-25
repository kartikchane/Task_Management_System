import { useCallback, useEffect, useState } from "react";
import api, { attachmentUrl } from "../api";
import { useRefresh } from "../hooks";
import { useAuth } from "../context";
import { Button, Badge, Empty, Skeleton, Modal, Field, PageHead, DIcon } from "../components/UI";
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  Send,
  Users,
  AlertCircle,
  Plus,
  Paperclip,
  Upload,
  MessageSquare,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";

const tone = {
  todo: "muted",
  pending: "muted",
  "in-progress": "blue",
  submitted: "purple",
  approved: "green",
  rework: "orange",
};
const today = () => new Date().toISOString().slice(0, 10);
const locked = (status) => ["submitted", "approved"].includes(status);

export default function DailyWork() {
  const { user } = useAuth();
  if (user.role === "employee") return <EmployeeDaily />;
  if (user.role === "admin") return <AdminDailyWork />;
  return <ManagerDaily />;
}

function AdminDailyWork() {
  const [tab, setTab] = useState("team");
  return (
    <>
      <div className="toolbar card" style={{ marginBottom: 18 }}>
        <Button variant={tab === "team" ? "primary" : undefined} onClick={() => setTab("team")}>
          Team Monitor
        </Button>
        <Button variant={tab === "my" ? "primary" : undefined} onClick={() => setTab("my")}>
          My Daily Tasks
        </Button>
      </div>
      {tab === "team" ? <ManagerDaily /> : <EmployeeDaily />}
    </>
  );
}

/* ---------------- Employee: work on tasks assigned by the manager ---------------- */

// The design asks for "work completed / blockers / plan for tomorrow / note".
// The API stores one submission note per task, so these fields are saved inside that note
// under fixed headings (the manager sees them in the review screen), and read back for rework.
const NOTE_HEADINGS = {
  work: "Work completed today:",
  blockers: "Blockers / support needed:",
  plan: "Plan for tomorrow:",
  note: "Note:",
};
const composeNote = (f) =>
  Object.entries(NOTE_HEADINGS)
    .map(([k, h]) => (f[k]?.trim() ? `${h}\n${f[k].trim()}` : null))
    .filter(Boolean)
    .join("\n\n");
function parseNote(text = "") {
  const out = { work: "", blockers: "", plan: "", note: "" };
  if (!text) return out;
  const keys = Object.keys(NOTE_HEADINGS);
  let current = null,
    found = false;
  for (const line of text.split("\n")) {
    const k = keys.find((key) => line.trim() === NOTE_HEADINGS[key]);
    if (k) {
      current = k;
      found = true;
    } else if (current) out[current] += (out[current] ? "\n" : "") + line;
  }
  if (!found) out.work = text; // older free-text notes
  keys.forEach((k) => (out[k] = out[k].trim()));
  return out;
}
const draftKey = (id) => "tf_daily_draft_" + id;
const readDraft = (id) => {
  try {
    return JSON.parse(localStorage.getItem(draftKey(id)) || "null");
  } catch {
    return null;
  }
};

function EmployeeDaily() {
  const [row, setRow] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const load = useCallback(
    () =>
      api.get("/daily-work/today").then((r) => {
        setRow(r.data);
        return r.data;
      }),
    [],
  );
  useRefresh(load);
  if (!row) return <Skeleton />;

  const todayTasks = (row.assignedTasks || []).map((t) => ({ ...t, workId: row._id, date: row.date, overdue: false }));
  const overdueTasks = (row.overdueTasks || []).map((t) => ({ ...t, overdue: true }));
  const allTasks = [...overdueTasks, ...todayTasks];
  const active =
    allTasks.find((t) => t._id === activeId) || allTasks.find((t) => !locked(t.status)) || allTasks[0] || null;

  const saveProgress = async (task, value) => {
    try {
      await api.patch(`/daily-work/tasks/${task.workId}/${task._id}/progress`, { progress: value });
      await load();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to update progress");
      return false;
    }
  };
  const toggleGenerated = async (id, done) => {
    try {
      const { data } = await api.patch(`/daily-work/today/generated-tasks/${id}`, { done });
      setRow((prev) => ({ ...data, overdueTasks: prev.overdueTasks }));
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to update checklist item");
    }
  };
  const addComment = async (task, text) => {
    try {
      await api.post(`/daily-work/tasks/${task.workId}/${task._id}/comments`, { text });
      await load();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to add comment");
      return false;
    }
  };
  const attach = async (e, task) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/daily-work/tasks/${task.workId}/${task._id}/attachments`, fd);
      toast.success("File uploaded");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to upload file");
    } finally {
      input.value = "";
    }
  };
  const submitTask = async (task, note) => {
    try {
      await api.post(`/daily-work/tasks/${task.workId}/${task._id}/submit`, { note });
      toast.success("Daily update submitted to your manager");
      await load();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to submit task");
      return false;
    }
  };

  return (
    <>
      <PageHead
        title="Daily Work Update"
        subtitle="Complete the tasks assigned to you today, attach proof and submit each one for review."
      />
      {overdueTasks.length > 0 && (
        <div className="notice warning">
          <AlertCircle />
          <div>
            <b>
              {overdueTasks.length} overdue task{overdueTasks.length > 1 ? "s" : ""} from previous days
            </b>
            <p>These are still open. Pick them from the list below, complete and submit them.</p>
          </div>
        </div>
      )}
      <section className="gp-panel">
        {allTasks.length > 1 && (
          <div className="dw-tasks" role="tablist" aria-label="Your tasks">
            {allTasks.map((t) => (
              <button
                key={t._id}
                role="tab"
                aria-selected={t._id === active?._id}
                className={"dw-tab" + (t._id === active?._id ? " active" : "")}
                onClick={() => setActiveId(t._id)}
              >
                <i className={t.overdue ? "overdue" : t.status} />
                <span>{t.title}</span>
                {t.overdue && <em>Overdue</em>}
              </button>
            ))}
          </div>
        )}
        {active ? (
          <DailyTaskForm
            key={active._id}
            task={active}
            onSaveProgress={saveProgress}
            onSubmit={submitTask}
            onAttach={attach}
            onComment={addComment}
          />
        ) : (
          <Empty
            image="empty-folder"
            title="No tasks assigned for today"
            text="Your admin/manager will assign your daily tasks here."
          />
        )}
      </section>
      {row.generatedTasks?.length > 0 && (
        <section className="gp-card">
          <div className="gp-card-head">
            <div>
              <h3 className="light">Recurring responsibilities</h3>
              <p>Generated automatically from your daily/weekly/monthly templates.</p>
            </div>
            <strong>
              {row.generatedTasks.filter((x) => x.done).length}/{row.generatedTasks.length}
            </strong>
          </div>
          <div className="stack-fields" style={{ marginTop: 16 }}>
            {row.generatedTasks.map((t) => (
              <label className="row" key={t._id}>
                <input type="checkbox" checked={t.done} onChange={(e) => toggleGenerated(t._id, e.target.checked)} />
                <span style={t.done ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>{t.title}</span>
              </label>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function DailyTaskForm({ task, onSaveProgress, onSubmit, onAttach, onComment }) {
  const isLocked = locked(task.status);
  const [progress, setProgress] = useState(task.progress || 0);
  const [f, setF] = useState(() => readDraft(task._id) || parseNote(task.submissionNote));
  const [busy, setBusy] = useState(false);
  useEffect(() => setProgress(task.progress || 0), [task.progress]);
  // Save the slider automatically a moment after the employee stops dragging it.
  useEffect(() => {
    if (isLocked || progress === (task.progress || 0)) return;
    const timer = setTimeout(() => onSaveProgress(task, progress), 800);
    return () => clearTimeout(timer);
  }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const save = async () => {
    localStorage.setItem(draftKey(task._id), JSON.stringify(f));
    const ok = progress === (task.progress || 0) ? true : await onSaveProgress(task, progress);
    if (ok) toast.success("Progress saved");
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit(task, composeNote(f));
    setBusy(false);
    if (ok) localStorage.removeItem(draftKey(task._id));
  };
  const status = (task.status === "todo" ? "pending" : task.status || "pending").replace("-", " ");
  const eyebrow = task.overdue ? `Overdue task · ${task.date}` : task.template ? "Today's fixed task" : "Today's task";

  return (
    <form onSubmit={submit}>
      <div className="dw-head">
        <div className="dw-icon">
          <DIcon name="checklist" />
        </div>
        <div className="dw-head-text">
          <span className={"dw-eyebrow" + (task.overdue ? " overdue" : "")}>{eyebrow}</span>
          <h2>{task.title}</h2>
          <p>
            {task.description ||
              "Record completed work, blockers and the next-day plan. This update is visible to your Manager and Super Admin."}
          </p>
        </div>
        <div className="dw-side">
          <span className={"dw-status " + task.status}>{status}</span>
          <small>
            Due {task.dueTime || "—"} · {task.priority} priority
          </small>
          <small>By {task.assignedBy?.name || "Manager"}</small>
        </div>
      </div>
      {task.status === "rework" && (
        <div className="notice warning" style={{ margin: "12px 0 0" }}>
          <AlertCircle />
          <div>
            <b>Changes requested</b>
            <p>{task.reviewNote || "Please update and resubmit this task."}</p>
          </div>
        </div>
      )}
      {task.status === "approved" && (
        <div className="notice success" style={{ margin: "12px 0 0" }}>
          <CheckCircle2 />
          <div>
            <b>Task approved</b>
            <p>{task.reviewNote || "Your manager approved this task."}</p>
          </div>
        </div>
      )}
      <div className="dw-body">
        <div className="dw-progress-head" style={{ padding: "0 0 0 0" }}>
          <div>
            <h3>Progress</h3>
            <p>Keep this updated during the day.</p>
          </div>
          <b>{progress}%</b>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          className="dw-range"
          style={{ "--p": progress + "%" }}
          value={progress}
          disabled={isLocked}
          onChange={(e) => setProgress(Number(e.target.value))}
          aria-label="Progress"
        />
        {isLocked ? (
          <div className="dw-submitted">
            <h4>
              Your submitted update
              {task.submittedAt && (
                <span className="muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 10 }}>
                  {new Date(task.submittedAt).toLocaleString("en-IN")}
                </span>
              )}
            </h4>
            <p className="preline">{task.submissionNote || "No note added."}</p>
          </div>
        ) : (
          <>
            <div className="dw-grid">
              <label className="dw-field tall">
                Work completed today
                <textarea
                  value={f.work}
                  onChange={set("work")}
                  placeholder="Explain tasks completed, modules worked on, fixes, testing and outcomes..."
                />
              </label>
              <div>
                <label className="dw-field">
                  Blockers / support needed
                  <textarea
                    value={f.blockers}
                    onChange={set("blockers")}
                    placeholder="Mention blockers, dependencies or write None"
                  />
                </label>
                <label className="dw-field">
                  Plan for tomorrow
                  <textarea
                    value={f.plan}
                    onChange={set("plan")}
                    placeholder="What will you continue or start tomorrow?"
                  />
                </label>
              </div>
            </div>
            <label className="dw-field dw-note">
              Submission note
              <input
                value={f.note}
                onChange={set("note")}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                placeholder="Optional short note for your manager"
              />
            </label>
          </>
        )}
        <div className="dw-actions">
          <div className="dw-files">
            {task.attachments?.map((a) => (
              <a key={a._id} href={attachmentUrl(a)} target="_blank" rel="noreferrer" className="dw-file">
                <Paperclip />
                <span>{a.name}</span>
              </a>
            ))}
            {!isLocked && (
              <label className="dw-attach">
                <Upload />
                Attach proof
                <input type="file" onChange={(e) => onAttach(e, task)} />
              </label>
            )}
          </div>
          {!isLocked && (
            <div className="dw-buttons">
              <Button type="button" variant="outline-navy lg" onClick={save}>
                <Save fill="currentColor" stroke="#fff" strokeWidth={1.6} />
                Save progress
              </Button>
              <Button type="submit" variant="navy lg" disabled={busy}>
                <Send fill="#fff" stroke="var(--gp-ink)" strokeWidth={1.4} />
                {busy ? "Submitting..." : "Submit daily update"}
              </Button>
            </div>
          )}
        </div>
      </div>
      <details className="dw-comments">
        <summary>Comments ({task.comments?.length || 0})</summary>
        {task.comments?.length ? (
          task.comments.map((c) => (
            <div className="comment" key={c._id}>
              <div className="avatar">{c.author?.name?.[0]}</div>
              <div>
                <b>{c.author?.name}</b>
                <p>{c.text}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">No comments yet.</p>
        )}
        <CommentBox onSend={(text) => onComment(task, text)} />
      </details>
    </form>
  );
}

// Comment input for the task. It is not a <form> because it sits inside the daily-update form.
function CommentBox({ onSend }) {
  const [text, setText] = useState("");
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (await onSend(text.trim())) setText("");
  };
  return (
    <div className="comment-form">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send(e)}
        placeholder="Write a comment for your manager..."
      />
      <Button type="button" onClick={send}>
        Send
      </Button>
    </div>
  );
}

/* ---------------- Admin / Super Admin: assign daily tasks and review submissions ---------------- */

function ManagerDaily() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(
    () =>
      Promise.all([api.get("/daily-work", { params: { date, status } }), api.get("/daily-work/employees")]).then(
        ([a, b]) => {
          setRows(a.data);
          setEmployees(b.data);
          return a.data;
        },
      ),
    [date, status],
  );
  useRefresh(load);

  const selectedRow = rows.find((r) => r._id === selectedWorkId) || null;
  const selectedTask = selectedRow?.assignedTasks.find((t) => t._id === selectedTaskId) || null;

  useEffect(() => {
    setReviewNote("");
  }, [selectedTaskId]);

  const assign = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try {
      await api.post("/daily-work/tasks", d);
      toast.success("Task assigned");
      setAssignOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to assign task");
    }
  };
  const addComment = async (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (!text) return;
    try {
      await api.post(`/daily-work/tasks/${selectedRow._id}/${selectedTask._id}/comments`, { text });
      e.target.reset();
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to add comment");
    }
  };
  const review = async (decision) => {
    try {
      await api.post(`/daily-work/tasks/${selectedRow._id}/${selectedTask._id}/review`, {
        decision,
        note: reviewNote,
      });
      toast.success(decision === "approved" ? "Task approved" : "Rework requested from employee");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to review task");
    }
  };
  const removeTask = async () => {
    if (!confirm("Remove this task?")) return;
    try {
      await api.delete(`/daily-work/tasks/${selectedRow._id}/${selectedTask._id}`);
      toast.success("Task removed");
      setSelectedTaskId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to remove task");
    }
  };

  const allTasks = rows.flatMap((r) => r.assignedTasks || []);
  const counts = {
    employees: new Set(rows.map((r) => String(r.employee?._id || r.employee))).size,
    pending: allTasks.filter((t) => ["todo", "in-progress"].includes(t.status)).length,
    submitted: allTasks.filter((t) => t.status === "submitted").length,
    approved: allTasks.filter((t) => t.status === "approved").length,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Daily Work Monitor</h1>
          <p>Assign daily tasks to your team, review submissions and approve or request changes.</p>
        </div>
        <Button variant="primary" onClick={() => setAssignOpen(true)}>
          <Plus />
          Assign daily task
        </Button>
      </div>
      <div className="grid cols-4">
        <Mini icon={<Users />} label="Employees shown" value={counts.employees} />
        <Mini icon={<Clock3 />} label="Pending tasks" value={counts.pending} />
        <Mini icon={<Send />} label="Submitted" value={counts.submitted} />
        <Mini icon={<CheckCircle2 />} label="Approved" value={counts.approved} />
      </div>
      <div className="toolbar card">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In progress</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rework">Rework</option>
        </select>
        <Button onClick={load}>
          <RefreshCw />
          Refresh
        </Button>
      </div>
      {rows.length ? (
        <div className="daily-grid">
          {rows.map((x) => (
            <article
              className="card daily-person"
              key={x._id}
              onClick={() => {
                setSelectedWorkId(x._id);
                if (x.assignedTasks?.length === 1) setSelectedTaskId(x.assignedTasks[0]._id);
              }}
            >
              <div className="row">
                <div className="avatar large">{x.employee?.name?.[0]}</div>
                <div className="grow">
                  <h3>{x.employee?.name}</h3>
                  <p>
                    {x.employee?.designation || "Employee"} · {x.department?.name}
                  </p>
                </div>
                <Badge tone={tone[x.status]}>{(x.status || "pending").replace("-", " ")}</Badge>
              </div>
              <div className="progress">
                <i style={{ width: (x.progress || 0) + "%" }} />
              </div>
              {x.assignedTasks?.length ? (
                <div className="stack-fields">
                  {x.assignedTasks.slice(0, 3).map((t) => (
                    <div
                      key={t._id}
                      className="row"
                      style={{ justifyContent: "space-between" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWorkId(x._id);
                        setSelectedTaskId(t._id);
                      }}
                    >
                      <span>{t.title}</span>
                      <Badge tone={tone[t.status]}>{(t.status || "pending").replace("-", " ")}</Badge>
                    </div>
                  ))}
                  {x.assignedTasks.length > 3 && (
                    <small className="muted">+{x.assignedTasks.length - 3} more task(s)</small>
                  )}
                </div>
              ) : (
                <p className="clamp">No tasks assigned yet.</p>
              )}
              <div className="daily-meta">
                <span>{x.assignedTasks?.length || 0} task(s)</span>
                <span>{x.date}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No records" text="No employees have daily work records for this filter." />
      )}
      {assignOpen && (
        <Modal title="Assign daily task" onClose={() => setAssignOpen(false)}>
          <form onSubmit={assign} className="form-grid">
            <Field label="Assign to">
              <select name="employeeId" required>
                <option value="">Select person</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name}
                    {e.role === "admin" ? " (Admin)" : ""} — {e.department?.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input name="date" type="date" defaultValue={today()} min={today()} required />
            </Field>
            <Field label="Task title">
              <input name="title" required />
            </Field>
            <Field label="Description">
              <textarea name="description" placeholder="What exactly needs to be done today" />
            </Field>
            <div className="form-grid two" style={{ padding: 0 }}>
              <Field label="Due time">
                <input name="dueTime" type="time" defaultValue="18:00" />
              </Field>
              <Field label="Priority">
                <select name="priority" defaultValue="medium">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </Field>
            </div>
            <div className="form-actions">
              <Button type="button" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary">Assign task</Button>
            </div>
          </form>
        </Modal>
      )}
      {selectedRow && (
        <Modal
          title={selectedRow.employee?.name + " — Daily Work"}
          onClose={() => {
            setSelectedWorkId(null);
            setSelectedTaskId(null);
          }}
          wide
        >
          {!selectedTask ? (
            <div className="form-grid">
              <div className="row wrap">
                <Badge tone={tone[selectedRow.status]}>{(selectedRow.status || "pending").replace("-", " ")}</Badge>
                <span className="muted">
                  {selectedRow.date} · {selectedRow.department?.name}
                </span>
              </div>
              {selectedRow.assignedTasks?.length ? (
                selectedRow.assignedTasks.map((t) => (
                  <article className="task-card" key={t._id} onClick={() => setSelectedTaskId(t._id)}>
                    <div className="row wrap">
                      <Badge tone={t.priority === "critical" ? "red" : t.priority === "high" ? "orange" : "muted"}>
                        {t.priority}
                      </Badge>
                      <Badge tone={tone[t.status]}>{(t.status || "pending").replace("-", " ")}</Badge>
                    </div>
                    <h3>{t.title}</h3>
                    <p>{t.description || "No description provided."}</p>
                    <div className="progress">
                      <i style={{ width: (t.progress || 0) + "%" }} />
                    </div>
                    <div className="task-card-foot">
                      <span>
                        <Clock3 /> Due {t.dueTime}
                      </span>
                      <span>
                        <MessageSquare />
                        {t.comments?.length || 0}
                        <Paperclip />
                        {t.attachments?.length || 0}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <Empty title="No tasks assigned" text="Assign a daily task to this employee to get started." />
              )}
            </div>
          ) : (
            <div className="task-detail">
              <div className="detail-main">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSelectedTaskId(null)}
                  style={{ marginBottom: 16 }}
                >
                  <ArrowLeft />
                  Back to tasks
                </button>
                <div className="row wrap">
                  <Badge tone={tone[selectedTask.status]}>{(selectedTask.status || "pending").replace("-", " ")}</Badge>
                  <Badge>{selectedTask.priority} priority</Badge>
                  <span className="muted">Due {selectedTask.dueTime}</span>
                </div>
                <h3>{selectedTask.title}</h3>
                <p>{selectedTask.description || "No description provided."}</p>
                <h4>Progress - {selectedTask.progress || 0}%</h4>
                <div className="progress">
                  <i style={{ width: (selectedTask.progress || 0) + "%" }} />
                </div>
                {selectedTask.submissionNote && (
                  <>
                    <h4>Employee's submission note</h4>
                    <p className="preline">{selectedTask.submissionNote}</p>
                  </>
                )}
                {selectedTask.reviewNote && (
                  <>
                    <h4>Your last feedback</h4>
                    <p className="preline">{selectedTask.reviewNote}</p>
                  </>
                )}
                <div className="detail-section">
                  <h4>Comments</h4>
                  {selectedTask.comments?.length ? (
                    selectedTask.comments.map((c) => (
                      <div className="comment" key={c._id}>
                        <div className="avatar">{c.author?.name?.[0]}</div>
                        <div>
                          <b>{c.author?.name}</b>
                          <p>{c.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="muted">No comments yet.</p>
                  )}
                  <form className="comment-form" onSubmit={addComment}>
                    <input name="text" placeholder="Write a comment..." />
                    <Button>Send</Button>
                  </form>
                </div>
              </div>
              <aside className="detail-side">
                <h4>Review</h4>
                <dl>
                  <dt>Employee</dt>
                  <dd>{selectedRow.employee?.name}</dd>
                  <dt>Assigned by</dt>
                  <dd>{selectedTask.assignedBy?.name || "—"}</dd>
                  <dt>Submitted</dt>
                  <dd>
                    {selectedTask.submittedAt
                      ? new Date(selectedTask.submittedAt).toLocaleString("en-IN")
                      : "Not submitted yet"}
                  </dd>
                  <dt>Attachments</dt>
                  <dd>{selectedTask.attachments?.length || 0} file(s)</dd>
                </dl>
                {selectedTask.attachments?.length > 0 && (
                  <div className="stack-fields">
                    {selectedTask.attachments.map((a) => (
                      <a key={a._id} href={attachmentUrl(a)} target="_blank" rel="noreferrer" className="btn full">
                        <Paperclip />
                        {a.name}
                      </a>
                    ))}
                  </div>
                )}
                {selectedTask.status === "submitted" && (
                  <div className="review-box">
                    <Field label="Feedback for employee">
                      <textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Add feedback (required for rework)"
                      />
                    </Field>
                    <Button variant="primary full" onClick={() => review("approved")}>
                      <CheckCircle2 />
                      Approve task
                    </Button>
                    <Button className="btn orange full" onClick={() => review("rework")}>
                      <RotateCcw />
                      Request changes
                    </Button>
                  </div>
                )}
                {!["submitted", "approved"].includes(selectedTask.status) && (
                  <div className="review-box">
                    <Button type="button" className="btn full" onClick={removeTask}>
                      <Trash2 />
                      Remove task
                    </Button>
                  </div>
                )}
              </aside>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

function Mini({ icon, label, value }) {
  return (
    <div className="stat card">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>Daily reporting</small>
      </div>
    </div>
  );
}
