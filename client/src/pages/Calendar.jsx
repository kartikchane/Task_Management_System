import { useCallback, useState } from "react";
import api from "../api";
import { useAuth } from "../context";
import { Empty, Skeleton, PageHead, Modal } from "../components/UI";
import { useRefresh } from "../hooks";

const PREVIEW = 4; // items shown in each card before "View all"

function monthRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

const dayKey = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};
const todayKey = () => new Date().toISOString().slice(0, 10);

// "Most recent first": today and upcoming (soonest first), then past days (latest first).
function recentFirst(items) {
  const t = todayKey();
  const upcoming = items.filter((x) => dayKey(x.date) >= t).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past = items.filter((x) => dayKey(x.date) < t).sort((a, b) => new Date(b.date) - new Date(a.date));
  return [...upcoming, ...past];
}
const byDate = (items) => [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

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

function CalendarItem({ x }) {
  const isToday = dayKey(x.date) === todayKey();
  return (
    <div className="cal-item">
      <DateBlock value={x.date} tone={x.tone} />
      <div>
        <strong title={x.title}>{x.title}</strong>
        <span>
          {isToday && <em className="cal-today">Today</em>}
          {x.meta}
        </span>
      </div>
    </div>
  );
}

function CalendarCard({ title, items, empty, onViewAll }) {
  const shown = recentFirst(items).slice(0, PREVIEW);
  return (
    <section className="gp-card cal-card">
      <div className="cal-card-head">
        <h3>{title}</h3>
        {items.length > 0 && <span className="cal-count">{items.length}</span>}
      </div>
      {items.length ? (
        <>
          <div className="cal-list">
            {shown.map((x) => (
              <CalendarItem x={x} key={x.key} />
            ))}
          </div>
          {items.length > PREVIEW && (
            <button type="button" className="cal-view-all" onClick={onViewAll}>
              View all {items.length}
            </button>
          )}
        </>
      ) : (
        <Empty compact image={empty.image} title={empty.title} text={empty.text} />
      )}
    </section>
  );
}

export default function Calendar() {
  const { user } = useAuth();
  const [d, setD] = useState({ tasks: [], leaves: [], holidays: [], dailyTasks: [] }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [open, setOpen] = useState(null); // which card's "View all" is open
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

  // Only show the person's name when it isn't the logged-in user (managers see their team).
  const who = (name) => (name && name !== user.name ? name : null);

  // Additional-task deadlines and daily-work tasks are both "deadlines", so they share one card.
  const deadlines = [
    ...(d.tasks || []).map((x) => ({
      key: "t" + x._id,
      date: x.dueDate,
      title: x.title,
      meta: "Additional task",
      tone: "blue",
    })),
    ...(d.dailyTasks || []).map((x) => ({
      key: "d" + x._id,
      date: x.date,
      title: x.title,
      meta: [who(x.employee?.name), "Daily work", x.dueTime && "Due " + x.dueTime].filter(Boolean).join(" · "),
      tone: "purple",
    })),
  ];
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

  const cards = {
    deadlines: {
      title: "Task Deadlines",
      items: deadlines,
      empty: {
        image: "cal-deadlines",
        title: "No task deadlines",
        text: "No task deadlines are scheduled this month.",
      },
    },
    leaves: {
      title: "Approved Leave",
      items: leaves,
      empty: { image: "cal-leave", title: "No approved leave", text: "Approved leave will appear here." },
    },
    holidays: {
      title: "Holidays",
      items: holidays,
      empty: { image: "cal-holidays", title: "No holidays", text: "No holidays are listed for this month." },
    },
  };
  const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <>
      <PageHead title="Work Calendar" subtitle="Tasks, leave and holidays in one view." />
      {loading ? (
        <Skeleton />
      ) : error ? (
        <Empty title="Unable to load calendar" text={error} />
      ) : (
        <div className="grid cols-3 cal-grid">
          {Object.entries(cards).map(([id, c]) => (
            <CalendarCard key={id} {...c} onViewAll={() => setOpen(id)} />
          ))}
        </div>
      )}
      {open && (
        <Modal title={`${cards[open].title} · ${month}`} onClose={() => setOpen(null)}>
          <div className="cal-list cal-modal-list">
            {byDate(cards[open].items).map((x) => (
              <CalendarItem x={x} key={x.key} />
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
