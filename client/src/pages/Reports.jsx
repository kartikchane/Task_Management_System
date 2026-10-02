import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import api from "../api";
import { Button, Empty, Skeleton, PageHead, StatCard, DIcon } from "../components/UI";
import { useRefresh } from "../hooks";
import { useAuth } from "../context";
import toast from "react-hot-toast";

const statuses = ["todo", "in-progress", "submitted", "approved", "rework"];
const statusTone = {
  todo: "#94a3b8",
  "in-progress": "#4169d8",
  submitted: "#8b5cf6",
  approved: "#16a085",
  rework: "#f59e0b",
};
const label = (status) => {
  const t = String(status || "").replace("-", " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const presetLabels = [
  ["today", "Today"],
  ["week", "This Week"],
  ["month", "This Month"],
  ["year", "This Year"],
  ["all", "All Time"],
];

// Empty state with one of the designer's illustrations (files in /public/design/illustrations)
const ReportEmpty = ({ image, title, text }) => (
  <div className="rep-empty">
    <img src={`/design/illustrations/${image}.webp`} alt="" />
    <h4>{title}</h4>
    <p>{text}</p>
  </div>
);
const iso = (d) => d.toISOString().slice(0, 10);
// Calendar date in the user's own time zone. (toISOString() is UTC, so in India the 1st of the
// month at midnight became the last day of the previous month.)
const localIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const presets = {
  today: () => {
    const d = new Date();
    return { from: iso(d), to: iso(d) };
  },
  week: () => {
    const d = new Date();
    const day = d.getDay() || 7;
    const start = new Date(d);
    start.setDate(d.getDate() - day + 1);
    return { from: localIso(start), to: iso(d) };
  },
  month: () => {
    const d = new Date();
    return { from: localIso(new Date(d.getFullYear(), d.getMonth(), 1)), to: iso(d) };
  },
  year: () => {
    const d = new Date();
    return { from: localIso(new Date(d.getFullYear(), 0, 1)), to: iso(d) };
  },
  all: () => ({ from: "", to: "" }),
};

export default function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState(null),
    [deps, setDeps] = useState([]),
    [employees, setEmployees] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [filters, setFilters] = useState({ department: "", employee: "", status: "", from: "", to: "" });
  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters]);
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return Promise.all([
      api.get("/reports/summary", { params }),
      api.get("/daily-work/employees"),
      ...(user.role === "superadmin" ? [api.get("/departments")] : []),
    ])
      .then(([summary, empRes, depRes]) => {
        setData(summary.data);
        setEmployees(empRes.data);
        if (depRes) setDeps(depRes.data);
      })
      .catch((e) => {
        setError(e.response?.data?.message || "Unable to load reports");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [params, user.role]);
  useRefresh(load);
  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Employee", "Completed", "Average Rating"],
      ...data.productivity.map((x) => [x.name, x.completed, x.avgRating || 0]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "taskflow-daily-work-productivity.csv");
  };
  const exportExcel = async () => {
    try {
      const r = await api.get("/reports/export", { params, responseType: "blob" });
      downloadBlob(r.data, "taskflow-report.xlsx");
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to export Excel");
    }
  };
  const printPdf = () => window.print();
  // which quick-range button matches the current From / To dates
  const activePreset = presetLabels.find(([k]) => {
    const r = presets[k]();
    return r.from === filters.from && r.to === filters.to;
  })?.[0];
  return (
    <>
      <PageHead
        title="Reports & Analytics"
        subtitle="Operational insight generated from live Daily Work records."
        date={false}
      >
        <div className="rep-exports">
          <button type="button" onClick={exportCsv}>
            <DIcon name="download" />
            CSV
          </button>
          <button type="button" onClick={exportExcel}>
            <FileSpreadsheet strokeWidth={2.4} />
            Excel
          </button>
          <button type="button" onClick={printPdf}>
            <DIcon name="printer" />
            PDF
          </button>
        </div>
      </PageHead>
      <div className="rep-bar">
        {user.role === "superadmin" && (
          <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
            <option value="">All departments</option>
            {deps.map((x) => (
              <option key={x._id} value={x._id}>
                {x.name}
              </option>
            ))}
          </select>
        )}
        <select value={filters.employee} onChange={(e) => setFilters({ ...filters, employee: e.target.value })}>
          <option value="">All employees</option>
          {employees.map((x) => (
            <option key={x._id} value={x._id}>
              {x.name}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {statuses.map((x) => (
            <option key={x} value={x}>
              {label(x)}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="From date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          type="date"
          aria-label="To date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
        <Button onClick={load}>
          <RefreshCw className="spin-icon" strokeWidth={2.6} />
          Refresh
        </Button>
      </div>
      <div className="rep-bar rep-presets">
        {presetLabels.map(([k, label]) => (
          <button
            type="button"
            key={k}
            className={activePreset === k ? "active" : ""}
            onClick={() => setFilters({ ...filters, ...presets[k]() })}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <Empty title="Unable to load reports" text={error} />
      ) : !data ? (
        <Empty title="No report data" text="Report data will appear here." />
      ) : (
        <div className="report-print">
          <div className="grid cols-3 rep-stats">
            <StatCard
              tone="blue"
              icon="warning"
              ghost="warning"
              label="Overdue daily tasks"
              value={data.overdue}
              sub="Needs attention"
            />
            <StatCard
              tone="green"
              icon="group"
              ghost="group"
              label="Status groups"
              value={data.byStatus.length}
              sub="Current workflow"
            />
            <StatCard
              tone="orange"
              icon="medal"
              ghost="medal"
              label="Top contributors"
              value={data.productivity.length}
              sub="Approved work"
            />
          </div>
          <div className="grid reports-grid">
            <section className={"card chart-card rep-panel" + (data.byStatus.length ? " has-data" : "")}>
              <div className="rep-panel-head">
                <h3>Daily tasks by status</h3>
                <p>Workflow distribution</p>
              </div>
              {data.byStatus.length ? (
                <div className="rep-chart">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.byStatus}
                        dataKey="count"
                        nameKey="_id"
                        innerRadius={62}
                        outerRadius={98}
                        paddingAngle={3}
                      >
                        {data.byStatus.map((x, i) => (
                          <Cell key={i} fill={statusTone[x._id] || "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="rep-legend">
                    {data.byStatus.map((x) => (
                      <li key={x._id}>
                        <i style={{ background: statusTone[x._id] || "#94a3b8" }} />
                        {label(x._id)}
                        <b>{x.count}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ReportEmpty
                  image="report-status"
                  title="No status data"
                  text="No daily tasks match the selected filters."
                />
              )}
            </section>
            <section className={"card chart-card rep-panel" + (data.productivity.length ? " has-data" : "")}>
              <div className="rep-panel-head">
                <h3>Top contributors</h3>
                <p>Approved daily tasks per employee</p>
              </div>
              {data.productivity.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.productivity} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="completed" fill="#2f6bea" radius={[8, 8, 0, 0]} maxBarSize={64} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ReportEmpty
                  image="report-trophy"
                  title="No productivity data"
                  text="Approved daily tasks will appear here."
                />
              )}
            </section>
          </div>
          {filters.employee && (
            <section className="card chart-card rep-panel has-data rep-timeline">
              <div className="rep-panel-head">
                <h3>{data.employee?.name || "Employee"} — Daily timeline</h3>
                <p>
                  {data.employee?.designation || "Employee"} · {data.employee?.department?.name || "—"}
                </p>
              </div>
              {data.timeline?.length ? (
                <div className="stack-fields">
                  {data.timeline.map((d) => (
                    <div key={d.date} className="row" style={{ justifyContent: "space-between" }}>
                      <span>{d.date}</span>
                      <span className="muted">
                        {d.approved}/{d.total} approved
                      </span>
                      <span
                        style={{
                          color: statusTone[d.status] || "#94a3b8",
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {(d.status || "pending").replace("-", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No daily work in range"
                  text="This employee has no daily work records for the selected period."
                />
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
