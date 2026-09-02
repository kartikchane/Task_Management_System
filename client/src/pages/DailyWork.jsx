import { useCallback, useEffect, useState } from "react";
import api from "../api";
import { useRefresh } from "../hooks";
import { useAuth } from "../context";
import { Button, Badge, Empty, Skeleton, Modal, Field } from "../components/UI";
import {
  CalendarDays,
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
  return user.role === "employee" ? <EmployeeDaily /> : <ManagerDaily />;
}

/* ---------------- Employee: work on tasks assigned by the manager ---------------- */

function EmployeeDaily() {
  const [row, setRow] = useState(null);
  const [openTaskId, setOpenTaskId] = useState(null);
  const load = useCallback(
    () => api.get("/daily-work/today").then((r) => { setRow(r.data); return r.data }),
    [],
  );
  useRefresh(load);
  if (!row) return <Skeleton />;

  const tasks = row.assignedTasks || [];
  const task = openTaskId ? tasks.find((t) => t._id === openTaskId) : null;
  const counts = {
    approved: tasks.filter((t) => t.status === "approved").length,
    submitted: tasks.filter((t) => t.status === "submitted").length,
  };

  const updateProgress = async (taskId, value) => {
    try {
      const { data } = await api.patch(
        `/daily-work/tasks/${row._id}/${taskId}/progress`,
        { progress: value },
      );
      setRow(data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to update progress");
    }
  };
  const addComment = async (e, taskId) => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (!text) return;
    try {
      await api.post(`/daily-work/tasks/${row._id}/${taskId}/comments`, { text });
      e.target.reset();
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to add comment");
    }
  };
  const attach = async (e, taskId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/daily-work/tasks/${row._id}/${taskId}/attachments`, fd);
      toast.success("File uploaded");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to upload file");
    } finally {
      e.target.value = "";
    }
  };
  const submitTask = async (e, taskId) => {
    e.preventDefault();
    try {
      const { data } = await api.post(
        `/daily-work/tasks/${row._id}/${taskId}/submit`,
        { note: e.target.note.value },
      );
      setRow(data);
      toast.success("Task submitted to your manager");
      setOpenTaskId(null);
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to submit task");
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Daily Work Update</h1>
          <p>Complete the tasks assigned to you today, attach proof and submit each one for review.</p>
        </div>
        <div className="date-chip">
          <CalendarDays />
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </div>
      <div className="daily-hero card">
        <div>
          <span className="eyebrow">Today's assigned work</span>
          <h2>{tasks.length ? `${counts.approved}/${tasks.length} tasks approved` : "No tasks assigned yet"}</h2>
          <p>Your admin/manager assigns tasks here every day. Update progress, attach documents and submit each task for review.</p>
        </div>
        <Badge tone={tone[row.status]}>{row.status.replace("-", " ")}</Badge>
      </div>
      {row.generatedTasks?.length > 0 && (
        <section className="card daily-form">
          <div className="section-head">
            <div>
              <h3>Recurring responsibilities</h3>
              <p>Generated automatically from your daily/weekly/monthly templates.</p>
            </div>
            <strong>{row.generatedTasks.filter((x) => x.done).length}/{row.generatedTasks.length}</strong>
          </div>
          <div className="stack-fields">
            {row.generatedTasks.map((t) => (
              <label className="row" key={t._id}>
                <input type="checkbox" checked={t.done} disabled readOnly />
                <span>{t.title}</span>
              </label>
            ))}
          </div>
        </section>
      )}
      {tasks.length ? (
        <div className="daily-grid">
          {tasks.map((t) => (
            <article className="task-card" key={t._id} onClick={() => setOpenTaskId(t._id)}>
              <div className="row wrap">
                <Badge tone={t.priority === "critical" ? "red" : t.priority === "high" ? "orange" : "muted"}>{t.priority}</Badge>
                <Badge tone={tone[t.status]}>{t.status.replace("-", " ")}</Badge>
              </div>
              <h3>{t.title}</h3>
              <p>{t.description || "No description provided."}</p>
              <div className="progress"><i style={{ width: (t.progress || 0) + "%" }} /></div>
              <div className="task-card-foot">
                <span><Clock3 /> Due {t.dueTime}</span>
                <span><MessageSquare />{t.comments?.length || 0}<Paperclip />{t.attachments?.length || 0}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No tasks assigned for today" text="Your admin/manager will assign your daily tasks here." />
      )}
      {task && (
        <Modal title={task.title} onClose={() => setOpenTaskId(null)} wide>
          <div className="task-detail">
            <div className="detail-main">
              <div className="row wrap">
                <Badge tone={tone[task.status]}>{task.status.replace("-", " ")}</Badge>
                <Badge>{task.priority} priority</Badge>
                <span className="muted">Due {task.dueTime} · Assigned by {task.assignedBy?.name || "Manager"}</span>
              </div>
              <p>{task.description || "No description provided."}</p>
              {task.status === "rework" && (
                <div className="notice warning">
                  <AlertCircle />
                  <div><b>Changes requested</b><p>{task.reviewNote || "Please update and resubmit this task."}</p></div>
                </div>
              )}
              {task.status === "approved" && (
                <div className="notice success">
                  <CheckCircle2 />
                  <div><b>Task approved</b><p>{task.reviewNote || "Your manager approved this task."}</p></div>
                </div>
              )}
              <h4>Progress - {task.progress || 0}%</h4>
              <input
                type="range"
                min="0"
                max="100"
                value={task.progress || 0}
                disabled={locked(task.status)}
                onChange={(e) => updateProgress(task._id, Number(e.target.value))}
              />
              <div className="detail-section">
                <h4>Comments</h4>
                {task.comments?.length ? (
                  task.comments.map((c) => (
                    <div className="comment" key={c._id}>
                      <div className="avatar">{c.author?.name?.[0]}</div>
                      <div><b>{c.author?.name}</b><p>{c.text}</p></div>
                    </div>
                  ))
                ) : (
                  <p className="muted">No comments yet.</p>
                )}
                <form className="comment-form" onSubmit={(e) => addComment(e, task._id)}>
                  <input name="text" placeholder="Write a comment for your manager..." />
                  <Button>Send</Button>
                </form>
              </div>
            </div>
            <aside className="detail-side">
              <h4>Task information</h4>
              <dl>
                <dt>Assigned by</dt><dd>{task.assignedBy?.name || "—"}</dd>
                <dt>Attachments</dt><dd>{task.attachments?.length || 0} file(s)</dd>
                <dt>Submitted</dt><dd>{task.submittedAt ? new Date(task.submittedAt).toLocaleString("en-IN") : "Not yet"}</dd>
              </dl>
              {task.attachments?.length > 0 && (
                <div className="stack-fields">
                  {task.attachments.map((a) => (
                    <a key={a._id} href={a.url} target="_blank" rel="noreferrer" className="btn full">
                      <Paperclip />{a.name}
                    </a>
                  ))}
                </div>
              )}
              {!locked(task.status) && (
                <label className="upload">
                  <Upload />
                  Attach document
                  <input type="file" onChange={(e) => attach(e, task._id)} />
                </label>
              )}
              {!locked(task.status) && (
                <form onSubmit={(e) => submitTask(e, task._id)} className="review-box">
                  <textarea name="note" placeholder="Submission note for your manager (optional)" defaultValue={task.submissionNote || ""} />
                  <Button variant="primary full"><Send />Submit for review</Button>
                </form>
              )}
            </aside>
          </div>
        </Modal>
      )}
    </>
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
      Promise.all([
        api.get("/daily-work", { params: { date, status } }),
        api.get("/daily-work/employees"),
      ]).then(([a, b]) => {
        setRows(a.data);
        setEmployees(b.data);
        return a.data;
      }),
    [date, status],
  );
  useRefresh(load);

  const selectedRow = rows.find((r) => r._id === selectedWorkId) || null;
  const selectedTask = selectedRow?.assignedTasks.find((t) => t._id === selectedTaskId) || null;

  useEffect(() => { setReviewNote(""); }, [selectedTaskId]);

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
        <Button variant="primary" onClick={() => setAssignOpen(true)}><Plus />Assign daily task</Button>
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
        <Button onClick={load}><RefreshCw />Refresh</Button>
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
                <div className="grow"><h3>{x.employee?.name}</h3><p>{x.employee?.designation || "Employee"} · {x.department?.name}</p></div>
                <Badge tone={tone[x.status]}>{x.status.replace("-", " ")}</Badge>
              </div>
              <div className="progress"><i style={{ width: (x.progress || 0) + "%" }} /></div>
              {x.assignedTasks?.length ? (
                <div className="stack-fields">
                  {x.assignedTasks.slice(0, 3).map((t) => (
                    <div
                      key={t._id}
                      className="row"
                      style={{ justifyContent: "space-between" }}
                      onClick={(e) => { e.stopPropagation(); setSelectedWorkId(x._id); setSelectedTaskId(t._id); }}
                    >
                      <span>{t.title}</span>
                      <Badge tone={tone[t.status]}>{t.status.replace("-", " ")}</Badge>
                    </div>
                  ))}
                  {x.assignedTasks.length > 3 && <small className="muted">+{x.assignedTasks.length - 3} more task(s)</small>}
                </div>
              ) : (
                <p className="clamp">No tasks assigned yet.</p>
              )}
              <div className="daily-meta"><span>{x.assignedTasks?.length || 0} task(s)</span><span>{x.date}</span></div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No records" text="No employees have daily work records for this filter." />
      )}
      {assignOpen && (
        <Modal title="Assign daily task" onClose={() => setAssignOpen(false)}>
          <form onSubmit={assign} className="form-grid">
            <Field label="Employee">
              <select name="employeeId" required>
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>{e.name} — {e.department?.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Date"><input name="date" type="date" defaultValue={today()} min={today()} required /></Field>
            <Field label="Task title"><input name="title" required /></Field>
            <Field label="Description"><textarea name="description" placeholder="What exactly needs to be done today" /></Field>
            <div className="form-grid two" style={{ padding: 0 }}>
              <Field label="Due time"><input name="dueTime" type="time" defaultValue="18:00" /></Field>
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
              <Button type="button" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button variant="primary">Assign task</Button>
            </div>
          </form>
        </Modal>
      )}
      {selectedRow && (
        <Modal
          title={selectedRow.employee?.name + " — Daily Work"}
          onClose={() => { setSelectedWorkId(null); setSelectedTaskId(null); }}
          wide
        >
          {!selectedTask ? (
            <div className="form-grid">
              <div className="row wrap">
                <Badge tone={tone[selectedRow.status]}>{selectedRow.status.replace("-", " ")}</Badge>
                <span className="muted">{selectedRow.date} · {selectedRow.department?.name}</span>
              </div>
              {selectedRow.assignedTasks?.length ? (
                selectedRow.assignedTasks.map((t) => (
                  <article className="task-card" key={t._id} onClick={() => setSelectedTaskId(t._id)}>
                    <div className="row wrap">
                      <Badge tone={t.priority === "critical" ? "red" : t.priority === "high" ? "orange" : "muted"}>{t.priority}</Badge>
                      <Badge tone={tone[t.status]}>{t.status.replace("-", " ")}</Badge>
                    </div>
                    <h3>{t.title}</h3>
                    <p>{t.description || "No description provided."}</p>
                    <div className="progress"><i style={{ width: (t.progress || 0) + "%" }} /></div>
                    <div className="task-card-foot">
                      <span><Clock3 /> Due {t.dueTime}</span>
                      <span><MessageSquare />{t.comments?.length || 0}<Paperclip />{t.attachments?.length || 0}</span>
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
                <button type="button" className="btn" onClick={() => setSelectedTaskId(null)} style={{ marginBottom: 16 }}>
                  <ArrowLeft />Back to tasks
                </button>
                <div className="row wrap">
                  <Badge tone={tone[selectedTask.status]}>{selectedTask.status.replace("-", " ")}</Badge>
                  <Badge>{selectedTask.priority} priority</Badge>
                  <span className="muted">Due {selectedTask.dueTime}</span>
                </div>
                <h3>{selectedTask.title}</h3>
                <p>{selectedTask.description || "No description provided."}</p>
                <h4>Progress - {selectedTask.progress || 0}%</h4>
                <div className="progress"><i style={{ width: (selectedTask.progress || 0) + "%" }} /></div>
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
                        <div><b>{c.author?.name}</b><p>{c.text}</p></div>
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
                  <dt>Employee</dt><dd>{selectedRow.employee?.name}</dd>
                  <dt>Assigned by</dt><dd>{selectedTask.assignedBy?.name || "—"}</dd>
                  <dt>Submitted</dt><dd>{selectedTask.submittedAt ? new Date(selectedTask.submittedAt).toLocaleString("en-IN") : "Not submitted yet"}</dd>
                  <dt>Attachments</dt><dd>{selectedTask.attachments?.length || 0} file(s)</dd>
                </dl>
                {selectedTask.attachments?.length > 0 && (
                  <div className="stack-fields">
                    {selectedTask.attachments.map((a) => (
                      <a key={a._id} href={a.url} target="_blank" rel="noreferrer" className="btn full">
                        <Paperclip />{a.name}
                      </a>
                    ))}
                  </div>
                )}
                {selectedTask.status === "submitted" && (
                  <div className="review-box">
                    <Field label="Feedback for employee">
                      <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Add feedback (required for rework)" />
                    </Field>
                    <Button variant="primary full" onClick={() => review("approved")}><CheckCircle2 />Approve task</Button>
                    <Button className="btn orange full" onClick={() => review("rework")}><RotateCcw />Request changes</Button>
                  </div>
                )}
                {!["submitted", "approved"].includes(selectedTask.status) && (
                  <div className="review-box">
                    <Button type="button" className="btn full" onClick={removeTask}><Trash2 />Remove task</Button>
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
      <div><span>{label}</span><strong>{value}</strong><small>Daily reporting</small></div>
    </div>
  );
}