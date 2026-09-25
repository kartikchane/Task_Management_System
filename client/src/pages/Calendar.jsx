import { useCallback, useState } from "react";
import api from "../api";
import { Empty, Skeleton, PageHead } from "../components/UI";
import { useRefresh } from "../hooks";

function monthRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

// Small coloured date block: "12 SEP"
function DateBlock({ value, tone }) {
  const d = new Date(value);
  const ok = !Number.isNaN(d.getTime());
  return (
    <div className={"cal-date tone-" + tone}>
      <b>{ok ? d.getDate() : "–"}</b>
      <small>{ok ? d.toLocaleDateString("en-IN", { month: "short" }) : ""}</small>
    </div>
  );
}

function CalendarCard({ title, items, empty }) {
  return (
    <section className="gp-card cal-card">
      <h3>{title}</h3>
      {items.length ? (
        <div className="cal-list">
          {items.map((x) => (
            <div className="cal-item" key={x.key}>
              <DateBlock value={x.date} tone={x.tone} />
              <div>
                <strong title={x.title}>{x.title}</strong>
                <span>{x.meta}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty compact image={empty.image} title={empty.title} text={empty.text} />
      )}
    </section>
  );
}

export default function Calendar() {
  const [d, setD] = useState({ tasks: [], leaves: [], holidays: [], dailyTasks: [] }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return api
      .get("/calendar", { params: monthRange() })
      .then((r) => setD(r.data))
      .catch((e) => {
        setError(e.response?.data?.message || "Unable to load calendar");
        setD({ tasks: [], leaves: [], holidays: [], dailyTasks: [] });
      })
      .finally(() => setLoading(false));
  }, []);
  useRefresh(load);

  // Additional-task deadlines and daily-work tasks are both "deadlines", so they share one card.
  const deadlines = [
    ...(d.tasks || []).map((x) => ({
      key: "t" + x._id,
      date: x.dueDate,
      title: x.title,
      meta: "Additional task · Due " + new Date(x.dueDate).toLocaleDateString("en-IN"),
      tone: "blue",
    })),
    ...(d.dailyTasks || []).map((x) => ({
      key: "d" + x._id,
      date: x.date,
      title: x.title,
      meta: [x.employee?.name, "Daily work", x.dueTime && "Due " + x.dueTime].filter(Boolean).join(" · "),
      tone: "purple",
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
  const leaves = (d.leaves || []).map((x) => ({
    key: x._id,
    date: x.fromDate,
    title: x.employee?.name || "Leave",
    meta: `${x.fromDate} to ${x.toDate}${x.type ? " · " + x.type : ""}`,
    tone: "green",
  }));
  const holidays = (d.holidays || []).map((x) => ({
    key: x._id,
    date: x.date,
    title: x.name,
    meta: x.date,
    tone: "orange",
  }));

  return (
    <>
      <PageHead title="Work Calendar" subtitle="Tasks, leave and holidays in one view." />
      {loading ? (
        <Skeleton />
      ) : error ? (
        <Empty title="Unable to load calendar" text={error} />
      ) : (
        <div className="grid cols-3">
          <CalendarCard
            title="Task Deadlines"
            items={deadlines}
            empty={{
              image: "cal-deadlines",
              title: "No task deadlines",
              text: "No task deadlines are scheduled this month.",
            }}
          />
          <CalendarCard
            title="Approved Leave"
            items={leaves}
            empty={{ image: "cal-leave", title: "No approved leave", text: "Approved leave will appear here." }}
          />
          <CalendarCard
            title="Holidays"
            items={holidays}
            empty={{ image: "cal-holidays", title: "No holidays", text: "No holidays are listed for this month." }}
          />
        </div>
      )}
    </>
  );
}
