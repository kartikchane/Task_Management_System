import { useCallback, useEffect, useState } from "react";
import api from "../api";
import { useRefresh } from "../hooks";
import { useAuth } from "../context";
import { Button, Modal, Field, Badge, Empty, Skeleton } from "../components/UI";
import {
  Plus,
  Search,
  Calendar,
  MessageSquare,
  Paperclip,
  ChevronRight,
  Upload,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

const tones = {
  completed: "green",
  "in-progress": "blue",
  pending: "orange",
  overdue: "red",
  "not-applicable": "muted",
};
const columns = [
  "pending",
  "in-progress",
  "completed",
  "overdue",
  "not-applicable",
];

export default function Tasks() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]),
    [projects, setProjects] = useState([]),
    [people, setPeople] = useState([]),
    [deps, setDeps] = useState([]);
  const [modal, setModal] = useState(false),
    [selected, setSelected] = useState(null),
    [progressDraft, setProgressDraft] = useState(0),
    [status, setStatus] = useState(params.get("status") || ""),
    [search, setSearch] = useState(params.get("search") || "");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    setStatus(params.get("status") || "");
    setSearch(params.get("search") || "");
  }, [params]);
  useEffect(() => {
    if (selected) setProgressDraft(Number(selected.progress) || 0);
  }, [selected?._id, selected?.progress]);
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return Promise.all([
      api.get("/tasks", { params: { status, search, limit: 100 } }),
      api.get("/projects"),
      ...(user.role !== "employee"
        ? [
            api.get("/users", { params: { role: "employee" } }),
            api.get("/departments"),
          ]
        : []),
    ])
      .then((r) => {
        setRows(r[0].data.items);
        setProjects(r[1].data);
        if (r[2]) setPeople(r[2].data);
        if (r[3]) setDeps(r[3].data);
      })
      .catch((e) => {
        setError(e.response?.data?.message || "Unable to load tasks");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [status, search, user.role]);
  useRefresh(load);
  const create = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target),
      d = Object.fromEntries(formData);
    d.completionRequirements = formData.getAll("completionRequirements");
    try {
      await api.post("/tasks", d);
      toast.success("Task assigned");
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to assign task");
    }
  };
  const openTask = async (task) => {
    try {
      const { data } = await api.get("/tasks/" + task._id);
      setSelected(data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to open task");
    }
  };
  const refreshSelected = async (id) => {
    const { data } = await api.get("/tasks/" + id);
    setSelected(data);
  };
  const progress = async (v) => {
    const next = Math.max(0, Math.min(100, Number(v)));
    if (!selected || next === Number(selected.progress)) return;
    try {
      await api.patch("/tasks/" + selected._id + "/progress", {
        progress: next,
      });
      await refreshSelected(selected._id);
      load();
    } catch (e) {
      setProgressDraft(Number(selected.progress) || 0);
      toast.error(e.response?.data?.message || "Unable to update progress");
    }
  };
  const canEditProgress =
    user.role === "employee" &&
    selected &&
    !["completed", "not-applicable"].includes(selected.status);
  const comment = async (e) => {
    e.preventDefault();
    const text = e.target.text.value;
    if (!text) return;
    try {
      await api.post("/tasks/" + selected._id + "/comments", { text });
      e.target.reset();
      await refreshSelected(selected._id);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to add comment");
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tasks/" + selected._id + "/submit", {
        note: e.target.note.value,
      });
      toast.success("Task marked completed");
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to submit task");
    }
  };
  const review = async (decision, e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    try {
      await api.post("/tasks/" + selected._id + "/review", { ...fd, decision });
      toast.success("Task status updated");
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to review task");
    }
  };
  const attach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post("/tasks/" + selected._id + "/attachments", fd);
      await refreshSelected(selected._id);
      toast.success("File uploaded");
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to upload file");
    }
  };
  const removeTask = async () => {
    if (!selected || !confirm("Delete this task?")) return;
    try {
      await api.delete("/tasks/" + selected._id);
      toast.success("Task deleted");
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to delete task");
    }
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{user.role === "employee" ? "My Tasks" : "Task Management"}</h1>
          <p>Assign, execute, submit and review work in one live workflow.</p>
        </div>
        {user.role !== "employee" && (
          <Button variant="primary" onClick={() => setModal(true)}>
            <Plus />
            Assign task
          </Button>
        )}
      </div>
      <div className="toolbar card">
        <div className="search">
          <Search />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setParams(
                Object.fromEntries(
                  Object.entries({ status, search: e.target.value }).filter(
                    ([, v]) => v,
                  ),
                ),
              );
            }}
            placeholder="Search tasks"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setParams(
              Object.fromEntries(
                Object.entries({ status: e.target.value, search }).filter(
                  ([, v]) => v,
                ),
              ),
            );
          }}
        >
          <option value="">All statuses</option>
          {columns.map((x) => (
            <option key={x} value={x}>
              {x.replace("-", " ")}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <Empty title="Unable to load tasks" text={error} />
      ) : rows.length ? (
        <div className="task-board">
          {columns.map((s) => (
            <section className="task-column" key={s}>
              <div className="column-head">
                <b>{s.replace("-", " ")}</b>
                <span>{rows.filter((x) => x.status === s).length}</span>
              </div>
              {rows
                .filter((x) => x.status === s)
                .map((x) => (
                  <article
                    className="task-card"
                    key={x._id}
                    onClick={() => openTask(x)}
                  >
                    <div className="row">
                      <Badge
                        tone={
                          x.priority === "critical"
                            ? "red"
                            : x.priority === "high"
                              ? "orange"
                              : "muted"
                        }
                      >
                        {x.priority}
                      </Badge>
                      <small>{x.project?.code}</small>
                    </div>
                    <h3>{x.title}</h3>
                    <p>{x.description}</p>
                    <div className="progress">
                      <i style={{ width: x.progress + "%" }} />
                    </div>
                    <div className="task-card-foot">
                      <span>
                        <Calendar />{" "}
                        {new Date(x.dueDate).toLocaleDateString("en-IN")}
                      </span>
                      <span>
                        <MessageSquare />
                        {x.comments?.length || 0}
                        <Paperclip />
                        {x.attachments?.length || 0}
                      </span>
                    </div>
                    <div className="assignee">
                      <div className="avatar">{x.assignedTo?.name?.[0]}</div>
                      <span>{x.assignedTo?.name}</span>
                      <ChevronRight />
                    </div>
                  </article>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <Empty
          title="No tasks found"
          text="Tasks matching your filters will appear here."
        />
      )}
      {modal && (
        <Modal title="Assign new task" onClose={() => setModal(false)} wide>
          <form onSubmit={create} className="form-grid two">
            <Field label="Task title">
              <input name="title" required />
            </Field>
            <Field label="Project">
              <select name="project" required>
                <option value="">Select project</option>
                {projects.map((x) => (
                  <option key={x._id} value={x._id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <select name="department" required>
                <option value="">Select department</option>
                {deps.map((x) => (
                  <option key={x._id} value={x._id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assign to">
              <select name="assignedTo" required>
                <option value="">Select employee</option>
                {people.map((x) => (
                  <option key={x._id} value={x._id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority">
                <option>medium</option>
                <option>high</option>
                <option>critical</option>
                <option>low</option>
              </select>
            </Field>
            <Field label="Due date">
              <input name="dueDate" type="date" required />
            </Field>
            <Field label="Description">
              <textarea name="description" required />
            </Field>
            <Field label="Completion proof required">
              <div className="stack-fields">
                {[
                  ["photo", "Photo"],
                  ["document", "Document"],
                  ["excel", "Excel"],
                  ["invoice", "Invoice"],
                  ["screenshot", "Screenshot"],
                  ["customer-confirmation", "Customer confirmation"],
                  ["remark", "Remark"],
                ].map(([value, label]) => (
                  <label className="row" key={value}>
                    <input
                      type="checkbox"
                      name="completionRequirements"
                      value={value}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </Field>
            <div className="form-actions span-2">
              <Button type="button" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button variant="primary">Assign task</Button>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)} wide>
          <div className="task-detail">
            <div className="detail-main">
              <div className="row wrap">
                <Badge tone={tones[selected.status]}>{selected.status}</Badge>
                <Badge>{selected.priority} priority</Badge>
                <span className="muted">
                  Due {new Date(selected.dueDate).toLocaleDateString("en-IN")}
                </span>
              </div>
              <p>{selected.description}</p>
              <h4>Progress - {progressDraft}%</h4>
              <input
                type="range"
                min="0"
                max="100"
                value={progressDraft}
                disabled={!canEditProgress}
                onChange={(e) => setProgressDraft(Number(e.target.value))}
                onMouseUp={() => progress(progressDraft)}
                onTouchEnd={() => progress(progressDraft)}
                onKeyUp={(e) =>
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) &&
                  progress(progressDraft)
                }
                onBlur={() => progress(progressDraft)}
              />
              {selected.completionRequirements?.length > 0 && (
                <div className="notice warning">
                  <b>Required to complete:</b>{" "}
                  {selected.completionRequirements
                    .join(", ")
                    .replaceAll("-", " ")}
                </div>
              )}
              <div className="detail-section">
                <h4>Comments</h4>
                {selected.comments?.length ? (
                  selected.comments.map((c) => (
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
                <form className="comment-form" onSubmit={comment}>
                  <input name="text" placeholder="Write a comment..." />
                  <Button>Send</Button>
                </form>
              </div>
              <div className="detail-section">
                <h4>History</h4>
                {selected.history?.length ? (
                  selected.history
                    .slice()
                    .reverse()
                    .map((h) => (
                      <div className="comment" key={h._id}>
                        <div className="task-dot" />
                        <div>
                          <b>{h.message || h.action}</b>
                          <p>
                            {h.actor?.name || "System"}{" "}
                            {h.from && h.to
                              ? `changed ${h.from} to ${h.to}`
                              : ""}
                          </p>
                          <small>
                            {new Date(h.createdAt).toLocaleString("en-IN")}
                          </small>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="muted">No history recorded yet.</p>
                )}
              </div>
            </div>
            <aside className="detail-side">
              <h4>Task information</h4>
              <dl>
                <dt>Project</dt>
                <dd>{selected.project?.name}</dd>
                <dt>Assigned to</dt>
                <dd>{selected.assignedTo?.name}</dd>
                <dt>Assigned by</dt>
                <dd>{selected.assignedBy?.name}</dd>
                <dt>Attachments</dt>
                <dd>{selected.attachments?.length || 0} file(s)</dd>
              </dl>
              <label className="upload">
                <Upload />
                Upload attachment
                <input type="file" onChange={attach} />
              </label>
              {user.role === "employee" &&
                !["completed", "not-applicable"].includes(selected.status) && (
                  <form onSubmit={submit} className="review-box">
                    <textarea
                      name="note"
                      placeholder="Completion remark (required only when selected)"
                    />
                    <Button variant="primary full">
                      <CheckCircle2 />
                      Mark completed
                    </Button>
                  </form>
                )}
              {user.role !== "employee" && (
                <form
                  className="review-box"
                  onSubmit={(e) => review(e.target.status.value, e)}
                >
                  <textarea name="note" placeholder="Manager comment" />
                  <select name="status" defaultValue={selected.status}>
                    {columns.map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("-", " ")}
                      </option>
                    ))}
                  </select>
                  <Button variant="primary full">
                    <CheckCircle2 />
                    Update task status
                  </Button>
                </form>
              )}
              {user.role !== "employee" && (
                <div className="review-box">
                  <Button
                    type="button"
                    className="btn full"
                    onClick={removeTask}
                  >
                    <Trash2 />
                    Delete task
                  </Button>
                </div>
              )}
            </aside>
          </div>
        </Modal>
      )}
    </>
  );
}
