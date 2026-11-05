import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import api, { errMsg } from "../../src/api";
import { IMAGES } from "../../src/assets";
import { PageTitle, Screen, TopBar } from "../../src/components/layout";
import { Card, Empty, Icon, Loading, Pill, ProgressBar } from "../../src/components/ui";
import { Toolbar } from "../../src/components/toolbar";
import { C, F, fs, u } from "../../src/theme";
import { shortDate } from "../../src/utils";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on-hold", label: "On hold" },
  { value: "completed", label: "Completed" },
];
const tone = { active: "green", "on-hold": "orange", completed: "blue", planning: "muted" };

// Screen-5: Projects
export default function Projects() {
  const params = useLocalSearchParams();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(params.search || "");
  const [status, setStatus] = useState("");
  useEffect(() => setSearch(params.search || ""), [params.search]);
  const load = useCallback(
    () =>
      api
        .get("/projects")
        .then((r) => {
          setRows(r.data);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load projects"))),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter(
      (x) => (!status || x.status === status) && (!q || `${x.name} ${x.code} ${x.description || ""}`.toLowerCase().includes(q)),
    );
  }, [rows, search, status]);

  return (
    <Screen header={<TopBar />} onRefresh={load}>
      <PageTitle title="Projects" subtitle="Task delivery, ownership, milestones and team allocation." />
      <Card style={ps.panel}>
        <Toolbar search={search} setSearch={setSearch} placeholder="Search projects" status={status} setStatus={setStatus} statuses={STATUSES} onRefresh={load} />
        {error ? (
          <Empty title="Unable to load projects" text={error} style={{ marginTop: u(28) }} />
        ) : !rows ? (
          <Loading />
        ) : shown.length ? (
          <View style={{ gap: u(20), marginTop: u(28) }}>
            {shown.map((x) => (
              <View key={x._id} style={ps.project}>
                <View style={ps.projectTop}>
                  <View style={ps.projectIcon}>
                    <Icon name="open-folder" size={u(38)} color="#2d1df6" />
                  </View>
                  <Pill text={x.status} tone={tone[x.status] || "muted"} />
                </View>
                <Text style={ps.projectName}>{x.name}</Text>
                <Text style={ps.projectDesc} numberOfLines={3}>
                  {x.description || "No description"}
                </Text>
                <View style={ps.meta}>
                  <Text style={ps.metaText}>📅 {x.endDate ? shortDate(x.endDate) : "No deadline"}</Text>
                  <Text style={ps.metaText}>👥 {x.members?.length || 0} members</Text>
                </View>
                <View style={ps.progressHead}>
                  <Text style={ps.metaText}>Progress</Text>
                  <Text style={[ps.metaText, { fontFamily: F.s, color: "#000" }]}>{x.progress || 0}%</Text>
                </View>
                <ProgressBar value={x.progress || 0} />
                <View style={ps.foot}>
                  <Text style={ps.metaText}>{x.department?.name || ""}</Text>
                  <Text style={[ps.metaText, { fontFamily: F.s, color: "#000" }]}>{x.code}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Empty image={IMAGES.emptyFolder} title="No projects found" text="Projects matching your filters will appear here." style={{ marginTop: u(28) }} />
        )}
      </Card>
    </Screen>
  );
}

export const ps = StyleSheet.create({
  panel: { padding: u(12), paddingBottom: u(20), borderRadius: u(18) },
  project: { borderWidth: 1, borderColor: "#e6ebf5", borderRadius: u(16), padding: u(26) },
  projectTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  projectIcon: { width: u(64), height: u(64), borderRadius: u(14), backgroundColor: "#eef0fe", alignItems: "center", justifyContent: "center" },
  projectName: { fontFamily: F.s, fontSize: fs(28), color: "#000", marginTop: u(16) },
  projectDesc: { fontFamily: F.r, fontSize: fs(21), color: C.muted, marginTop: u(6) },
  meta: { flexDirection: "row", gap: u(30), marginTop: u(16) },
  metaText: { fontFamily: F.r, fontSize: fs(20), color: C.muted },
  progressHead: { flexDirection: "row", justifyContent: "space-between", marginTop: u(16), marginBottom: u(10) },
  foot: { flexDirection: "row", justifyContent: "space-between", marginTop: u(16) },
});
