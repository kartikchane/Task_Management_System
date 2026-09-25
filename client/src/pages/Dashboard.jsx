import { useCallback, useState } from "react";
import api from "../api";
import { useRefresh } from "../hooks";
import { useAuth } from "../context";
import {
  Users,
  Building2,
  FolderKanban,
  AlertTriangle,
  ArrowUpRight,
  History,
  UserCheck,
  ClipboardCheck,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { Badge, Skeleton, Empty, StatCard, DIcon } from "../components/UI";
import { Link } from "react-router-dom";

const dailyTone = { todo: "muted", "in-progress": "blue", submitted: "purple", approved: "green", rework: "orange" };

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null),
    [insights, setInsights] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const calls = [api.get("/dashboard")];
    if (user.role !== "employee") calls.push(api.get("/manager-insights"));
    return Promise.all(calls)
      .then(([dashboard, manager]) => {
        setData(dashboard.data);
        setInsights(manager?.data || null);
      })
      .catch((e) => {
        setError(e.response?.data?.message || "Unable to load dashboard");
        setData(null);
        setInsights(null);
      })
      .finally(() => setLoading(false));
  }, [user.role]);
  useRefresh(load);
  if (loading) return <Skeleton />;
  if (error) return <Empty title="Unable to load dashboard" text={error} />;
  const t = data?.stats.tasks || {};
  const today = data?.today || {};
  // [value, label, icon, colour, link]
  const cards =
    user.role === "employee"
      ? [
          [t.total || 0, "My Tasks", "checklist", "blue", "/daily-work"],
          [t["in-progress"] || 0, "In Progress", "clock", "green", "/daily-work"],
          [t.pending || 0, "Pending", "top-right", "orange", "/daily-work"],
          [t.approved || 0, "Completed", "checked", "purple", "/daily-work"],
        ]
      : [
          [data.stats.users, user.role === "admin" ? "My Team" : "People", <Users />, "blue", "/users"],
          [data.stats.departments, "Departments", <Building2 />, "green", "/departments"],
          [data.stats.projects, "Projects", <FolderKanban />, "orange", "/projects"],
          [t.total || 0, "Total Daily Tasks", "checklist", "purple", "/daily-work"],
        ];
  const firstName = user.name.split(" ")[0];
  return (
    <>
      <div className="welcome">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString("en-IN", { weekday: "long" })}, {new Date().getDate()}{" "}
            {new Date().toLocaleDateString("en-IN", { month: "long" })}
          </p>
          <h1>Good to see you, {firstName}</h1>
          <p>
            {user.role === "employee"
              ? `Employee ID : ${user.employeeCode || "Not assigned"}`
              : "Here is what is happening across your workspace today."}
          </p>
        </div>
        <Link className="btn sky" to="/tasks">
          Open task board <ArrowUpRight />
        </Link>
      </div>
      {user.role === "admin" && !user.department && (
        <div className="notice warning">
          <Building2 />
          <div>
            <b>Create your department first</b>
            <p>Your employees, projects, tasks and daily updates will live inside your department.</p>
            <Link className="btn primary" to="/departments">
              Create department <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      )}
      <div className="grid cols-4">
        {cards.map(([v, l, icon, tone, to]) => (
          <StatCard key={l} label={l} value={v} icon={icon} tone={tone} to={to} />
        ))}
      </div>
      <section className="command-center card">
        <div className="section-head">
          <div>
            <h3>Today Command Center</h3>
            <p>Fast operational signals for the current day</p>
          </div>
          {user.role !== "employee" && <Link to="/approvals">Open approvals</Link>}
        </div>
        <div className="command-grid">
          <Link to="/daily-work" className="command-item tone-blue">
            <DIcon name="due-date" />
            <span>Due Today</span>
            <b>{today.dueToday || 0}</b>
          </Link>
          <Link to="/daily-work" className="command-item tone-red">
            <DIcon name="warning" />
            <span>Overdue</span>
            <b>{today.overdue || 0}</b>
          </Link>
          <Link to={user.role === "employee" ? "/leave" : "/approvals"} className="command-item tone-blue">
            <DIcon name="airplane" style={{ color: "#1d1df0" }} />
            <span>Pending Leave</span>
            <b>{today.pendingLeaves || 0}</b>
          </Link>
          <Link to="/attendance" className="command-item tone-green">
            <DIcon name="checked" />
            <span>Present</span>
            <b>{today.present || 0}</b>
          </Link>
          <Link to="/attendance" className="command-item tone-orange">
            <History strokeWidth={2.6} />
            <span>Late</span>
            <b>{today.late || 0}</b>
          </Link>
          <Link to="/daily-work" className="command-item tone-blue">
            <DIcon name="time" style={{ color: "#1d1df0" }} />
            <span>Daily submitted</span>
            <b>{today.dailySubmitted || 0}</b>
          </Link>
        </div>
      </section>
      {user.role !== "employee" && insights && (
        <section className="team-control card">
          <div className="section-head">
            <div>
              <h3>{user.role === "admin" ? "My Team Control Room" : "Workforce Control Room"}</h3>
              <p>Manager-ready view of attendance, daily updates and task risk</p>
            </div>
            <Link to="/daily-work">Review daily work</Link>
          </div>
          <div className="team-metrics">
            <Link to="/users">
              <UserCheck />
              <span>Team size</span>
              <b>{insights.summary.teamSize}</b>
            </Link>
            <Link to="/attendance">
              <CheckCircle2 />
              <span>Checked in</span>
              <b>{insights.summary.present + insights.summary.late}</b>
            </Link>
            <Link to="/daily-work">
              <ClipboardCheck />
              <span>Missing daily</span>
              <b>{insights.summary.missingDaily}</b>
            </Link>
            <Link to="/tasks" className={insights.summary.overdue ? "hot" : ""}>
              <ShieldAlert />
              <span>Overdue</span>
              <b>{insights.summary.overdue}</b>
            </Link>
          </div>
          {insights.alerts?.length > 0 && (
            <div className="insight-alerts">
              {insights.alerts.map((a) => (
                <Link to={a.link} className={"insight-alert " + a.tone} key={a.title}>
                  <AlertTriangle />
                  <div>
                    <b>{a.title}</b>
                    <span>{a.message}</span>
                  </div>
                  <ArrowUpRight />
                </Link>
              ))}
            </div>
          )}
          <div className="team-table">
            <div className="team-table-head">
              <span>Employee</span>
              <span>Attendance</span>
              <span>Daily update</span>
              <span>Open work</span>
              <span>Signal</span>
            </div>
            {insights.team?.length ? (
              insights.team.map((x) => (
                <Link to={`/users`} className={"team-table-row " + (x.risk ? "risk" : "")} key={x.employee._id}>
                  <div className="person">
                    <div className="avatar">{x.employee.name?.[0]}</div>
                    <div>
                      <b>{x.employee.name}</b>
                      <span>{x.employee.designation || x.employee.department?.name || "Employee"}</span>
                    </div>
                  </div>
                  <Badge tone={x.attendance?.status === "late" ? "orange" : x.attendance ? "green" : "red"}>
                    {x.attendance?.status || "no check-in"}
                  </Badge>
                  <Badge
                    tone={
                      ["submitted", "approved"].includes(x.daily?.status)
                        ? "green"
                        : x.daily?.status === "rework"
                          ? "orange"
                          : "muted"
                    }
                  >
                    {x.daily?.status || "pending"}
                  </Badge>
                  <span>
                    <b>{x.taskCount}</b> open, <b>{x.overdue}</b> overdue
                  </span>
                  <small>{x.signals?.length ? x.signals.join(" | ") : "On track"}</small>
                </Link>
              ))
            ) : (
              <Empty title="No team data" text="Assign employees to managers to see live team insights." />
            )}
          </div>
        </section>
      )}
      <div className="grid dashboard-grid">
        <section className="card">
          <div className="section-head">
            <div>
              <h3>Recent work</h3>
              <p>Latest task activity</p>
            </div>
            <Link to="/daily-work">View all</Link>
          </div>
          <div className="task-list">
            {data.recent?.length ? (
              data.recent.map((x) => (
                <div className="task-row" key={x._id}>
                  <div className="task-dot" />
                  <div className="grow">
                    <b>{x.title}</b>
                    <span>
                      {user.role !== "employee" && (x.employee?.name || "Employee") + " · "}Due {x.dueTime || "—"} ·{" "}
                      {x.date}
                    </span>
                  </div>
                  <Badge tone={dailyTone[x.status]}>{x.status.replace("-", " ")}</Badge>
                  <div className="mini-progress">
                    <i style={{ width: (x.progress || 0) + "%" }} />
                  </div>
                  <small>{x.progress || 0}%</small>
                </div>
              ))
            ) : (
              <div className="recent-empty">
                <div className="task-dot" />
                No recent work yet. Newly assigned or updated tasks will show here.
              </div>
            )}
          </div>
        </section>
        <section className="card">
          <div className="section-head">
            <div>
              <h3>Task health</h3>
              <p>Current status distribution</p>
            </div>
          </div>
          <div className="health-list">
            {[
              ["Completed", t.approved || 0, "green"],
              ["In Progress", t["in-progress"] || 0, "blue"],
              ["Pending", t.pending || 0, "orange"],
              ["Overdue", t.overdue || 0, "red"],
              ["Submitted", t.submitted || 0, "purple"],
              ["Rework", t.rework || 0, "grey"],
            ].map(([l, v, c]) => (
              <div key={l}>
                <span>
                  <i className={c} />
                  {l}
                </span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
