import { useCallback, useMemo, useState } from "react";
import api from "../api";
import { useRefresh } from "../hooks";
import { Button, Empty, Skeleton, PageHead, DIcon } from "../components/UI";
import { Check, FileText, Megaphone, NotepadText, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

// Pick the icon + colour for a notification from its type (e.g. "daily-assigned", "leave", "task-rework").
function kind(type = "") {
  if (type.startsWith("leave")) return ["tone-leave", <DIcon name="calendar" />];
  if (type.startsWith("task") || type.includes("project"))
    return ["tone-task", <NotepadText fill="currentColor" stroke="#fff" strokeWidth={1.8} />];
  if (type.startsWith("daily") || type.includes("reminder")) return ["tone-bell", <DIcon name="bell" />];
  if (type === "attendance" || type === "pattern" || type.includes("announce"))
    return ["tone-announce", <Megaphone fill="currentColor" strokeWidth={1.6} />];
  return ["tone-doc", <FileText fill="currentColor" stroke="#fff" strokeWidth={1.8} />];
}

export default function Notifications() {
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return api
      .get("/notifications")
      .then((r) => setRows(r.data))
      .catch((e) => {
        setError(e.response?.data?.message || "Unable to load notifications");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);
  useRefresh(load);
  const all = async () => {
    try {
      await api.patch("/notifications/read-all");
      window.dispatchEvent(new Event("tf-refresh")); // reloads this list and the bell badge
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to mark notifications read");
    }
  };
  const mark = async (x) => {
    if (x.read) return;
    try {
      await api.patch("/notifications/" + x._id + "/read");
      window.dispatchEvent(new Event("tf-refresh"));
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to update notification");
    }
  };
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (x) =>
        (!filter || (filter === "unread" ? !x.read : x.read)) &&
        (!q || `${x.title} ${x.message}`.toLowerCase().includes(q)),
    );
  }, [rows, search, filter]);
  return (
    <>
      <PageHead title="Notifications" subtitle="Stay updated with assignments, submissions and important updates." />
      <section className="gp-panel">
        <div className="gp-toolbar plain">
          <div className="search">
            <DIcon name="magnifying-glass" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notifications..." />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <Button variant="lg" onClick={load}>
            <RefreshCw className="spin-icon" strokeWidth={2.6} />
            Refresh
          </Button>
          <Button variant="soft lg" onClick={all}>
            <Check strokeWidth={3.4} style={{ width: 34, height: 34, color: "#1a3a9a" }} />
            Mark all read
          </Button>
        </div>
        {loading ? (
          <Skeleton />
        ) : error ? (
          <Empty title="Unable to load notifications" text={error} />
        ) : shown.length ? (
          <div className="notif-list">
            {shown.map((x) => {
              const [tone, icon] = kind(x.type);
              return (
                <button className={"notif-row " + (!x.read ? "unread" : "")} key={x._id} onClick={() => mark(x)}>
                  <div className={"notif-tile " + tone}>{icon}</div>
                  <div className="notif-body">
                    <div className="row">
                      <b>{x.title}</b>
                      {!x.read && <span className="new-pill">New</span>}
                    </div>
                    <p>{x.message}</p>
                    <small>{new Date(x.createdAt).toLocaleString("en-IN")}</small>
                  </div>
                  <i className="notif-dot" title={x.read ? "Read" : "Unread"} />
                </button>
              );
            })}
          </div>
        ) : (
          <Empty
            title={rows.length ? "No matching notifications" : "All caught up"}
            text={rows.length ? "Try a different search or filter." : "You have no notifications right now."}
          />
        )}
      </section>
    </>
  );
}
