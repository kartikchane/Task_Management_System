import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import api, { errMsg } from "../../../src/api";
import { IMAGES } from "../../../src/assets";
import { useAuth } from "../../../src/auth";
import { BackHeader, Screen } from "../../../src/components/layout";
import { Card, DateChip, Dialog, Empty, Loading } from "../../../src/components/ui";
import { C, F, fs, tones, u } from "../../../src/theme";
import { localIso, todayIso } from "../../../src/utils";

const PREVIEW = 3;
const monthRange = () => {
  const n = new Date();
  return { from: localIso(new Date(n.getFullYear(), n.getMonth(), 1)), to: localIso(new Date(n.getFullYear(), n.getMonth() + 1, 0)) };
};
const day = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : localIso(d);
};
// today and upcoming first (soonest first), then the latest past ones
const recentFirst = (items) => {
  const t = todayIso();
  return [
    ...items.filter((x) => day(x.date) >= t).sort((a, b) => new Date(a.date) - new Date(b.date)),
    ...items.filter((x) => day(x.date) < t).sort((a, b) => new Date(b.date) - new Date(a.date)),
  ];
};

// Screen-13: Work Calendar
export default function Calendar() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const load = useCallback(
    () =>
      api
        .get("/calendar", { params: monthRange() })
        .then((r) => {
          setD(r.data);
          setError("");
        })
        .catch((e) => setError(errMsg(e, "Unable to load calendar"))),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const who = (n) => (n && n !== user.name ? n : null);
  const cards = d
    ? {
        deadlines: {
          title: "Task Deadlines",
          image: IMAGES.calDeadlines,
          empty: ["No task deadlines", "No task deadlines are scheduled this month."],
          items: [
            ...(d.tasks || []).map((x) => ({ key: "t" + x._id, date: x.dueDate, title: x.title, meta: "Additional task", tone: "blue" })),
            ...(d.dailyTasks || []).map((x) => ({
              key: "d" + x._id,
              date: x.date,
              title: x.title,
              meta: [who(x.employee?.name), "Daily work", x.dueTime && "Due " + x.dueTime].filter(Boolean).join(" · "),
              tone: "purple",
            })),
          ],
        },
        leaves: {
          title: "Approved Leave",
          image: IMAGES.calLeave,
          empty: ["No approved leave", "Approved leave will appear here."],
          items: (d.leaves || []).map((x) => ({ key: x._id, date: x.fromDate, title: x.employee?.name || "Leave", meta: `${x.fromDate} to ${x.toDate}`, tone: "green" })),
        },
        holidays: {
          title: "Holidays",
          image: IMAGES.calHolidays,
          empty: ["No holidays", "No holidays are listed for this month."],
          items: (d.holidays || []).map((x) => ({ key: x._id, date: x.date, title: x.name, meta: x.date, tone: "orange" })),
        },
      }
    : null;
  const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return (
    <Screen header={<BackHeader bold title={"Work\nCalendar"} subtitle="Tasks, leave and holidays in one view." right={<DateChip style={{ maxWidth: "56%", marginTop: u(6) }} />} />} onRefresh={load}>
      {error ? (
        <Empty title="Unable to load calendar" text={error} />
      ) : !cards ? (
        <Loading color="#fff" />
      ) : (
        <View style={cs.grid}>
          {Object.entries(cards).map(([id, c], i) => (
            <Card key={id} style={[cs.card, i === 2 && cs.center]}>
              <Text style={cs.title}>
                {c.title}
                {c.items.length ? `  (${c.items.length})` : ""}
              </Text>
              {c.items.length ? (
                <>
                  {recentFirst(c.items)
                    .slice(0, PREVIEW)
                    .map((x) => (
                      <Item key={x.key} x={x} />
                    ))}
                  {c.items.length > PREVIEW && (
                    <Pressable onPress={() => setOpen(id)} style={cs.viewAll}>
                      <Text style={cs.viewAllText}>View all {c.items.length}</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <View style={cs.empty}>
                  <View style={cs.blob}>
                    <Image source={c.image} style={{ width: u(110), height: u(110) }} contentFit="contain" />
                  </View>
                  <Text style={cs.emptyTitle}>{c.empty[0]}</Text>
                  <Text style={cs.emptyText}>{c.empty[1]}</Text>
                </View>
              )}
            </Card>
          ))}
        </View>
      )}
      {open && (
        <Dialog visible onClose={() => setOpen(null)} title={`${cards[open].title} · ${month}`}>
          {[...cards[open].items]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map((x) => (
              <Item key={x.key} x={x} />
            ))}
        </Dialog>
      )}
    </Screen>
  );
}

function Item({ x }) {
  const dt = new Date(x.date);
  const t = tones[x.tone] || tones.blue;
  const isToday = day(x.date) === todayIso();
  return (
    <View style={cs.item}>
      <View style={[cs.date, { backgroundColor: t.bg }]}>
        <Text style={[cs.dateDay, { color: t.fg }]}>{Number.isNaN(dt.getTime()) ? "–" : dt.getDate()}</Text>
        <Text style={[cs.dateMon, { color: t.fg }]}>{Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={cs.itemTitle} numberOfLines={2}>
          {x.title}
        </Text>
        <Text style={cs.itemMeta} numberOfLines={1}>
          {isToday ? "Today · " : ""}
          {x.meta}
        </Text>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: u(20) },
  card: { width: "48.6%", borderRadius: u(18), padding: u(20), paddingTop: u(28) },
  center: { marginHorizontal: "25.7%" },
  title: { fontFamily: F.r, fontSize: fs(21), color: "#000", marginBottom: u(22), marginLeft: u(2) },
  empty: { borderWidth: 1, borderStyle: "dashed", borderColor: "#666", borderRadius: u(14), alignItems: "center", paddingTop: u(26), paddingBottom: u(36), paddingHorizontal: u(12) },
  blob: { width: u(145), height: u(122), borderRadius: 99, backgroundColor: "#eef1fb", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: F.s, fontSize: fs(26), color: "#000", marginTop: u(18), textAlign: "center" },
  emptyText: { fontFamily: F.r, fontSize: fs(21), color: "#000", textAlign: "center", marginTop: u(2) },
  item: { flexDirection: "row", gap: 10, alignItems: "center", borderWidth: 1, borderColor: "#e6ebf5", borderRadius: 12, padding: 8, marginBottom: 8 },
  date: { width: 44, borderRadius: 9, alignItems: "center", paddingVertical: 4 },
  dateDay: { fontFamily: F.b, fontSize: 16, lineHeight: 19 },
  dateMon: { fontFamily: F.m, fontSize: 10 },
  itemTitle: { fontFamily: F.m, fontSize: 12.5, color: "#000", lineHeight: 16 },
  itemMeta: { fontFamily: F.r, fontSize: 11, color: "#555" },
  viewAll: { marginTop: 4, borderRadius: 10, backgroundColor: C.fieldBg, paddingVertical: 9, alignItems: "center" },
  viewAllText: { fontFamily: F.m, fontSize: 12.5, color: "#1017c9" },
});
