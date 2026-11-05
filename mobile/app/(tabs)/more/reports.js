import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import api, { errMsg } from "../../../src/api";
import { IMAGES } from "../../../src/assets";
import { useAuth } from "../../../src/auth";
import { shareDownload, sharePdf, shareText } from "../../../src/exporter";
import { toast } from "../../../src/toast";
import { BackHeader, Screen } from "../../../src/components/layout";
import { Card, DateField, Empty, Icon, Loading, Select, StatCard } from "../../../src/components/ui";
import { C, F, fs, shadow, u } from "../../../src/theme";
import { label, localIso } from "../../../src/utils";

const STATUSES = ["todo", "in-progress", "submitted", "approved", "rework"];
const COLORS = { todo: "#94a3b8", "in-progress": "#4169d8", submitted: "#8b5cf6", approved: "#16a085", rework: "#f59e0b" };
const PRESETS = [
  ["today", "Today"],
  ["week", "This Week"],
  ["month", "This Month"],
  ["year", "This Year"],
  ["all", "All Time"],
];
const range = (k) => {
  const d = new Date();
  if (k === "today") return { from: localIso(d), to: localIso(d) };
  if (k === "week") {
    const s = new Date(d);
    s.setDate(d.getDate() - ((d.getDay() || 7) - 1));
    return { from: localIso(s), to: localIso(d) };
  }
  if (k === "month") return { from: localIso(new Date(d.getFullYear(), d.getMonth(), 1)), to: localIso(d) };
  if (k === "year") return { from: localIso(new Date(d.getFullYear(), 0, 1)), to: localIso(d) };
  return { from: "", to: "" };
};

// Screen-16: Reports & Analytics (managers)
export default function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [deps, setDeps] = useState([]);
  const [f, setF] = useState({ department: "", employee: "", status: "", from: "", to: "" });
  const params = useMemo(() => Object.fromEntries(Object.entries(f).filter(([, v]) => v)), [f]);
  const load = useCallback(
    () =>
      Promise.all([api.get("/reports/summary", { params }), api.get("/daily-work/employees"), ...(user.role === "superadmin" ? [api.get("/departments")] : [])])
        .then(([a, b, c]) => {
          setData(a.data);
          setEmployees(b.data);
          if (c) setDeps(c.data);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load reports"))),
    [params, user.role],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const active = PRESETS.find(([k]) => {
    const r = range(k);
    return r.from === f.from && r.to === f.to;
  })?.[0];

  const csv = async () => {
    if (!data) return;
    const rows = [["Employee", "Completed", "Average Rating"], ...data.productivity.map((x) => [x.name, x.completed, x.avgRating || 0])];
    const text = rows.map((r) => r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    try {
      await shareText("taskflow-daily-work-productivity.csv", text, "text/csv");
    } catch (e) {
      toast.error("Unable to export CSV");
    }
  };
  const excel = async () => {
    try {
      toast("Preparing Excel file...");
      await shareDownload("/reports/export", params, "taskflow-report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e) {
      toast.error(errMsg(e, "Unable to export Excel"));
    }
  };
  const pdf = async () => {
    if (!data) return;
    const tr = (cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    const html = `<html><head><meta name="viewport" content="width=device-width"><style>body{font-family:Helvetica,Arial;padding:24px;color:#111}h1{color:#2f4392;margin:0}p{color:#555}table{border-collapse:collapse;width:100%;margin-top:14px}td,th{border:1px solid #dfe5f0;padding:8px;text-align:left;font-size:13px}th{background:#f0f4fb}.k{display:inline-block;margin-right:24px;margin-top:10px}.k b{font-size:22px;display:block}</style></head><body>
      <h1>Reports &amp; Analytics</h1><p>Ganesh Gauri Industries · ${f.from || "All time"}${f.to ? " to " + f.to : ""} · generated ${new Date().toLocaleString("en-IN")}</p>
      <div class="k">Overdue daily tasks<b>${data.overdue}</b></div><div class="k">Status groups<b>${data.byStatus.length}</b></div><div class="k">Top contributors<b>${data.productivity.length}</b></div>
      <h3>Daily tasks by status</h3><table><tr><th>Status</th><th>Count</th></tr>${data.byStatus.map((x) => tr([label(x._id), x.count])).join("") || tr(["No data", ""])}</table>
      <h3>Top contributors</h3><table><tr><th>Employee</th><th>Approved tasks</th><th>Average rating</th></tr>${data.productivity.map((x) => tr([x.name, x.completed, x.avgRating || 0])).join("") || tr(["No data", "", ""])}</table>
      </body></html>`;
    try {
      await sharePdf(html, "taskflow-report.pdf");
    } catch (e) {
      toast.error("Unable to create PDF");
    }
  };

  return (
    <Screen
      header={
        <BackHeader
          bold
          title={"Reports &\nAnalytics"}
          subtitle="Operational insight generated from live Daily Work records."
          right={
            <View style={rs.exports}>
              <Export icon="download-to-storage-drive" text="CSV" onPress={csv} />
              <Export icon={<Ionicons name="document-text" size={u(36)} color={C.blueText} />} text="Excel" onPress={excel} />
              <Export icon="printer" text="PDF" onPress={pdf} />
            </View>
          }
        />
      }
      onRefresh={load}
    >
      <Card style={rs.bar}>
        {user.role === "superadmin" && (
          <Select compact value={f.department} onChange={(v) => setF({ ...f, department: v })} title="Department" style={rs.ctl} options={[{ value: "", label: "All departments" }, ...deps.map((d) => ({ value: d._id, label: d.name }))]} />
        )}
        <Select compact value={f.employee} onChange={(v) => setF({ ...f, employee: v })} title="Employee" style={rs.ctl} options={[{ value: "", label: "All employees" }, ...employees.map((e) => ({ value: e._id, label: e.name }))]} />
        <Select compact value={f.status} onChange={(v) => setF({ ...f, status: v })} title="Status" style={rs.ctl} options={[{ value: "", label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: label(s) }))]} />
        <DateField compact value={f.from} onChange={(v) => setF({ ...f, from: v })} style={rs.ctl} />
        <DateField compact value={f.to} onChange={(v) => setF({ ...f, to: v })} style={rs.ctl} />
        <Pressable onPress={load} style={rs.refresh}>
          <Ionicons name="refresh" size={u(34)} color="#2f5bd0" />
          <Text style={rs.refreshText}>Refresh</Text>
        </Pressable>
      </Card>
      <Card style={[rs.bar, { justifyContent: "space-between" }]}>
        {PRESETS.map(([k, l]) => (
          <Pressable key={k} onPress={() => setF({ ...f, ...range(k) })} style={[rs.preset, active === k && rs.presetOn]}>
            <Text style={[rs.presetText, active === k && { color: "#fff" }]}>{l}</Text>
          </Pressable>
        ))}
      </Card>
      {error ? (
        <Empty title="Unable to load reports" text={error} />
      ) : !data ? (
        <Loading color="#fff" />
      ) : (
        <>
          <View style={rs.grid}>
            <StatCard compact label="Overdue daily tasks" value={data.overdue} sub="Needs attention" icon="warning" ghost="warning" tone="blue" style={rs.gridItem} />
            <StatCard compact label="Status groups" value={data.byStatus.length} sub="Current workflow" icon="crowd-of-users" ghost="crowd-of-users" tone="green" style={rs.gridItem} />
            <StatCard compact label="Top contributors" value={data.productivity.length} sub="Approved work" icon="medals" ghost="medals" tone="orange" style={[rs.gridItem, { marginHorizontal: "25.7%" }]} />
          </View>
          <Card style={rs.panel}>
            <Text style={rs.panelTitle}>Daily tasks by status</Text>
            <Text style={rs.panelSub}>Workflow distribution</Text>
            {data.byStatus.length ? <Donut rows={data.byStatus} /> : <Illustrated image={IMAGES.reportStatus} title="No status data" text="No daily tasks match the selected filters." />}
          </Card>
          <Card style={rs.panel}>
            <Text style={rs.panelTitle}>Top contributors</Text>
            <Text style={rs.panelSub}>Approved daily tasks per employee</Text>
            {data.productivity.length ? <Bars rows={data.productivity} /> : <Illustrated image={IMAGES.reportTrophy} title="No productivity data" text="Approved daily tasks will appear here." />}
          </Card>
          {!!f.employee && (
            <Card style={[rs.panel, { paddingBottom: u(26) }]}>
              <Text style={rs.panelTitle}>{data.employee?.name || "Employee"} — Daily timeline</Text>
              <Text style={rs.panelSub}>
                {data.employee?.designation || "Employee"} · {data.employee?.department?.name || "—"}
              </Text>
              {data.timeline?.length ? (
                data.timeline.map((d) => (
                  <View key={d.date} style={rs.timeRow}>
                    <Text style={rs.timeText}>{d.date}</Text>
                    <Text style={[rs.timeText, { color: "#666" }]}>
                      {d.approved}/{d.total} approved
                    </Text>
                    <Text style={[rs.timeText, { color: COLORS[d.status] || "#94a3b8", fontFamily: F.s }]}>{label(d.status || "pending")}</Text>
                  </View>
                ))
              ) : (
                <Text style={[rs.panelSub, { marginTop: 12 }]}>No daily work in this period.</Text>
              )}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const Export = ({ icon, text, onPress }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [rs.export, pressed && { opacity: 0.8 }]}>
    {typeof icon === "string" ? <Icon name={icon} size={u(36)} color={C.blueText} /> : icon}
    <Text style={rs.exportText}>{text}</Text>
  </Pressable>
);

const Illustrated = ({ image, title, text }) => (
  <View style={{ alignItems: "center", paddingBottom: u(30) }}>
    <Image source={image} style={{ width: u(440), height: u(220), marginTop: u(10) }} contentFit="contain" />
    <Text style={rs.emptyTitle}>{title}</Text>
    <Text style={rs.emptyText}>{text}</Text>
  </View>
);

function Donut({ rows }) {
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  const R = 70,
    r = 44,
    cx = 90,
    cy = 90;
  let a0 = -Math.PI / 2;
  const arcs = rows.map((x) => {
    const a1 = a0 + (x.count / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad, ang) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
    const [x1, y1] = p(R, a0),
      [x2, y2] = p(R, a1 - 0.001),
      [x3, y3] = p(r, a1 - 0.001),
      [x4, y4] = p(r, a0);
    const d = `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`;
    a0 = a1;
    return { d, color: COLORS[x._id] || "#94a3b8", key: x._id };
  });
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: u(20), gap: u(24) }}>
      <Svg width={180} height={180} viewBox="0 0 180 180">
        {rows.length === 1 ? <Circle cx={cx} cy={cy} r={(R + r) / 2} stroke={arcs[0].color} strokeWidth={R - r} fill="none" /> : arcs.map((a) => <Path key={a.key} d={a.d} fill={a.color} stroke="#fff" strokeWidth={2} />)}
        <SvgText x={cx} y={cy + 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#111">
          {total}
        </SvgText>
      </Svg>
      <View style={{ flex: 1, gap: 8 }}>
        {rows.map((x) => (
          <View key={x._id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS[x._id] || "#94a3b8" }} />
            <Text style={[rs.timeText, { flex: 1 }]}>{label(x._id)}</Text>
            <Text style={[rs.timeText, { fontFamily: F.s }]}>{x.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Bars({ rows }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520) - u(80) - u(52);
  const H = 190;
  const max = Math.max(1, ...rows.map((r) => r.completed));
  const n = Math.min(rows.length, 8);
  const slot = (W - 30) / n;
  const bw = Math.min(46, slot * 0.6);
  return (
    <Svg width={W} height={H + 30} style={{ marginTop: u(20) }}>
      {[0, 0.5, 1].map((t) => (
        <G key={t}>
          <Line x1={28} x2={W} y1={10 + (1 - t) * H} y2={10 + (1 - t) * H} stroke="#e5e8f0" strokeDasharray="3 3" />
          <SvgText x={22} y={14 + (1 - t) * H} textAnchor="end" fontSize="10" fill="#666">
            {Math.round(max * t)}
          </SvgText>
        </G>
      ))}
      {rows.slice(0, n).map((x, i) => {
        const h = (x.completed / max) * H;
        const xPos = 30 + i * slot + (slot - bw) / 2;
        return (
          <G key={x.name + i}>
            <Rect x={xPos} y={10 + H - h} width={bw} height={h} rx={6} fill="#2f6bea" />
            <SvgText x={xPos + bw / 2} y={H + 26} textAnchor="middle" fontSize="10" fill="#444">
              {String(x.name).split(" ")[0].slice(0, 10)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

const rs = StyleSheet.create({
  exports: { flexDirection: "row", gap: u(12), marginTop: u(14) },
  export: { flexDirection: "row", alignItems: "center", gap: u(8), backgroundColor: "#fcfcfc", borderWidth: 2, borderColor: "#8fd8ff", borderRadius: u(12), height: u(52), paddingHorizontal: u(12), ...shadow },
  exportText: { fontFamily: F.s, fontSize: fs(25), color: C.blueText },
  bar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: u(14), padding: u(16), marginBottom: u(10), borderRadius: u(16) },
  ctl: { flexGrow: 1, flexBasis: "30%" },
  refresh: { flexDirection: "row", alignItems: "center", gap: u(10), height: u(60), paddingHorizontal: u(14), borderWidth: 1.5, borderColor: C.fieldLine, borderRadius: u(8), flexGrow: 1, justifyContent: "center" },
  refreshText: { fontFamily: F.m, fontSize: fs(20), color: C.blueText },
  preset: { paddingHorizontal: u(16), height: u(60), justifyContent: "center", borderWidth: 1.5, borderColor: C.fieldLine, borderRadius: u(8), backgroundColor: "#fff" },
  presetOn: { backgroundColor: "#6eabfc", borderColor: "#6eabfc" },
  presetText: { fontFamily: F.m, fontSize: fs(20), color: C.blueText },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: u(20), marginTop: u(30) },
  gridItem: { width: "48.6%" },
  panel: { marginTop: u(40), paddingHorizontal: u(26), paddingTop: u(30), borderRadius: u(18), backgroundColor: "#fff" },
  panelTitle: { fontFamily: F.s, fontSize: fs(30), color: "#000" },
  panelSub: { fontFamily: F.r, fontSize: fs(23), color: "#000", marginTop: u(6) },
  emptyTitle: { fontFamily: F.s, fontSize: fs(30), color: "#000", marginTop: u(8) },
  emptyText: { fontFamily: F.r, fontSize: fs(23), color: "#555", marginTop: u(6), textAlign: "center" },
  timeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f0f0f0", marginTop: 6 },
  timeText: { fontFamily: F.r, fontSize: 13, color: "#111" },
});
