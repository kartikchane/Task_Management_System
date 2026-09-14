import { useCallback, useState } from "react";
import api from "../api";
import { Button, Badge, Empty, Field, Skeleton } from "../components/UI";
import { useRefresh } from "../hooks";
import { CalendarCheck2, RefreshCw, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const parseTasks = (text) =>
  text
    .split("\n")
    .map((line) => line.replace(/^\s*(day\s*)?\d+[.):-]?\s*/i, "").trim())
    .filter(Boolean);

const emptyForm = {
  title: "",
  department: "",
  description: "",
  cadence: "daily",
  priority: "medium",
  workingDays: [1, 2, 3, 4, 5, 6],
  monthlyDay: 1,
  assigneeMode: "selected",
  employees: [],
  tasksText: "",
  rotation: false,
};

export default function DailyTemplates() {
  const [rows, setRows] = useState([]);
  const [deps, setDeps] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [f, setF] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return Promise.all([api.get("/daily-templates"), api.get("/departments"), api.get("/daily-work/employees")])
      .then(([a, b, c]) => {
        setRows(a.data);
        setDeps(b.data);
        setEmployees(c.data);
      })
      .catch((e) => {
        setError(e.response?.data?.message || "Unable to load daily templates");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);
  useRefresh(load);

  const submit = async (e) => {
    e.preventDefault();
    const checklist = parseTasks(f.tasksText);
    if (f.assigneeMode === "selected" && !f.employees.length) {
      toast.error("Select at least one employee");
      return;
    }
    const payload = {
      title: f.title,
      department: f.department,
      description: f.description,
      cadence: f.cadence,
      priority: f.priority,
      workingDays: f.workingDays,
      monthlyDay: f.monthlyDay,
      assigneeMode: f.assigneeMode,
      employees: f.assigneeMode === "selected" ? f.employees : [],
      checklist,
      rotation: f.rotation,
    };
    try {
      if (editingId) {
        await api.patch(`/daily-templates/${editingId}`, payload);
        toast.success("Template updated");
      } else {
        await api.post("/daily-templates", payload);
        toast.success(checklist.length > 1 ? `Template created with ${checklist.length} daily tasks` : "Template created");
      }
      setF({ ...emptyForm, department: f.department, assigneeMode: f.assigneeMode });
      setEditingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to save template");
    }
  };
  const edit = (x) => {
    setEditingId(x._id);
    setF({
      title: x.title || "",
      department: x.department?._id || x.department || "",
      description: x.description || "",
      cadence: x.cadence || "daily",
      priority: x.priority || "medium",
      workingDays: x.workingDays?.length ? x.workingDays : [1, 2, 3, 4, 5, 6],
      monthlyDay: x.monthlyDay || 1,
      assigneeMode: x.assigneeMode || "selected",
      employees: (x.employees || []).map((e) => e._id || e),
      tasksText: (x.checklist || []).join("\n"),
      rotation: !!x.rotation,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setF(emptyForm);
  };
  const remove = async (id) => {
    if (!confirm("Delete this template? Already-generated tasks stay as-is.")) return;
    try {
      await api.delete(`/daily-templates/${id}`);
      toast.success("Template removed");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to delete template");
    }
  };
  const generate = async () => {
    try {
      const r = await api.post("/daily-templates/generate", {});
      toast.success(r.data.message + " (" + r.data.created + ")");
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to generate daily work");
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recurring Task Templates</h1>
          <p>
            Store an employee's standing daily tasks once — every working day they're assigned automatically in
            Daily Work, ready to attach proof and submit for review, just like a normal daily task.
          </p>
        </div>
        <Button onClick={generate}>
          <CalendarCheck2 />
          Generate Today
        </Button>
      </div>
      <form className="card daily-form" onSubmit={submit}>
        {editingId && (
          <div className="notice warning">
            <div><b>Editing template</b><p>Update the fields below (especially Working days) and save.</p></div>
          </div>
        )}
        <div className="form-grid two">
          <Field label="Template name (internal label)">
            <input
              required
              placeholder="e.g. Monica — HR daily tasks"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </Field>
          <Field label="Department">
            <select required value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}>
              <option value="">Select department</option>
              {deps.map((x) => (
                <option key={x._id} value={x._id}>{x.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Assign to">
            <select value={f.assigneeMode} onChange={(e) => setF({ ...f, assigneeMode: e.target.value, employees: [] })}>
              <option value="selected">Specific employee(s)</option>
              <option value="department">Whole department</option>
            </select>
          </Field>
          {f.assigneeMode === "selected" && (
            <Field label="Employees">
              <select
                multiple
                value={f.employees}
                onChange={(e) => setF({ ...f, employees: [...e.target.selectedOptions].map((x) => x.value) })}
              >
                {employees.map((x) => (
                  <option key={x._id} value={x._id}>{x.name}{x.role === "admin" ? " (Admin)" : ""}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Frequency">
            <select value={f.cadence} onChange={(e) => setF({ ...f, cadence: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
          <Field label="Priority">
            <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </Field>
          {f.cadence === "monthly" ? (
            <Field label="Day of month">
              <input
                type="number"
                min="1"
                max="31"
                value={f.monthlyDay}
                onChange={(e) => setF({ ...f, monthlyDay: Number(e.target.value) })}
              />
            </Field>
          ) : (
            <Field label={f.cadence === "weekly" ? "Weekday (pick exactly one for a weekly rotation)" : "Working days"}>
              <select
                multiple
                value={f.workingDays}
                onChange={(e) => setF({ ...f, workingDays: [...e.target.selectedOptions].map((x) => Number(x.value)) })}
              >
                {weekdayNames.map((x, i) => (
                  <option value={i} key={i}>{x}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <p className="muted" style={{ fontSize: ".85rem" }}>
          Hold Ctrl (Cmd on Mac) and click to select only the specific day(s) you want. All days are pre-selected by
          default — if you want a task to appear on just one day (e.g. only Saturdays), click that day alone to
          replace the selection.
        </p>
        <div className="form-grid two" style={{ marginTop: 0 }}>
          <Field label="Description (optional, applies to every task below)">
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
        </div>
        <label className="row" style={{ marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={f.rotation}
            onChange={(e) => setF({ ...f, rotation: e.target.checked })}
          />
          <span>
            <b>Rotate one task per day</b> — task 1 on the first working day, task 2 on the next, and so on
            (instead of showing every task every day)
          </span>
        </label>
        <Field label="Daily tasks — one per line">
          <textarea
            rows={6}
            placeholder={"Check job portals and collect suitable CVs\nSource CVs for Sales Executive positions\nMaintain and update the interview tracker\n..."}
            value={f.tasksText}
            onChange={(e) => setF({ ...f, tasksText: e.target.value })}
          />
        </Field>
        <p className="muted" style={{ fontSize: ".85rem" }}>
          {f.rotation ? (
            <>
              <b>Rotation mode is on.</b> Pick your working days above in order (e.g. Monday–Saturday), then list one
              task per line in the same order — line 1 goes to the 1st working day, line 2 to the 2nd, and so on.
              Only that single task shows to the employee that day, cycling back to the top once the list ends.
            </>
          ) : (
            <>
              Paste the employee's list of standing daily responsibilities — one task per line (numbering like "1."
              is stripped automatically). Each line becomes its own task card every working day. Leave this blank to
              use the template name above as a single task instead.
            </>
          )}
        </p>
        <div className="form-actions">
          <Button variant="primary">
            <Save />
            {editingId ? "Save Changes" : "Create Template"}
          </Button>
          {editingId && (
            <Button type="button" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </form>
      <div className="toolbar card">
        <span>{rows.length} template{rows.length === 1 ? "" : "s"}</span>
        <Button onClick={load}>
          <RefreshCw />
          Refresh
        </Button>
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <Empty title="Unable to load templates" text={error} />
      ) : rows.length ? (
        <div className="grid cols-3">
          {rows.map((x) => (
            <article className="card project-card" key={x._id}>
              <div className="project-top">
                <div className="project-icon"><CalendarCheck2 /></div>
                <div className="row" style={{ gap: 6 }}>
                  {x.rotation && <Badge tone="purple">Rotation</Badge>}
                  <Badge tone={x.active ? "green" : "muted"}>{x.active ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
              <h3>{x.title}</h3>
              {x.rotation && x.checklist?.length ? (
                <div className="stack-fields" style={{ marginBottom: 8 }}>
                  {[...new Set(x.workingDays?.length ? x.workingDays : [1, 2, 3, 4, 5, 6])]
                    .sort((a, b) => a - b)
                    .map((d, i) => (
                      <div key={d} className="row" style={{ justifyContent: "space-between", fontSize: ".85rem" }}>
                        <b>{weekdayNames[d].slice(0, 3)}</b>
                        <span className="muted">{x.checklist[i % x.checklist.length]}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p>{x.checklist?.length ? `${x.checklist.length} daily task(s): ${x.checklist.slice(0, 3).join(", ")}${x.checklist.length > 3 ? "…" : ""}` : x.description || "No description"}</p>
              )}
              <div className="project-footer">
                <span>{x.assigneeMode === "selected" ? (x.employees?.map((e) => e.name).join(", ") || "No employees selected") : x.department?.name || "No department"}</span>
                <b>{x.cadence || "daily"} · {x.priority || "medium"}</b>
              </div>
              <p className="muted" style={{ fontSize: ".8rem", marginTop: 6 }}>
                {x.cadence === "monthly"
                  ? `Day ${x.monthlyDay || 1} of every month`
                  : (x.workingDays?.length === 7 || !x.workingDays?.length)
                  ? "Every day (Sun–Sat)"
                  : x.workingDays?.length === 6 && !x.workingDays.includes(0)
                  ? "Every day except Sunday"
                  : (x.workingDays || []).map((d) => weekdayNames[d].slice(0, 3)).join(", ")}
              </p>
              <div className="form-actions" style={{ marginTop: 10 }}>
                <Button type="button" className="btn" onClick={() => edit(x)}>
                  Edit
                </Button>
                <Button type="button" className="btn full" onClick={() => remove(x._id)}>
                  <Trash2 />
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No recurring templates" text="Create a daily, weekly or monthly template to start automatic work generation." />
      )}
    </>
  );
}