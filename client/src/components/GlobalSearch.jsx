import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import api, { escapeRegex } from "../api";
import { useAuth } from "../context";
import { DIcon } from "./UI";

const MIN_CHARS = 2; // start searching after this many letters
const PER_GROUP = 5; // results shown per group

const has = (text, q) =>
  String(text || "")
    .toLowerCase()
    .includes(q);

/**
 * "Search workspace..." box in the header.
 * Looks in: page names, Additional Tasks, Projects, today's Daily Work and (for managers) People and Departments.
 * `links` is the sidebar list from Layout.jsx: [path, label, icon, roles].
 */
export default function GlobalSearch({ links }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({});
  const [active, setActive] = useState(0);
  const box = useRef(null);
  const input = useRef(null);
  const lists = useRef({}); // lists that are loaded once and filtered in the browser (projects, departments, daily work)
  const term = q.trim().toLowerCase();
  const manager = user.role !== "employee";

  // close when the page changes or the user clicks somewhere else
  useEffect(() => {
    setOpen(false);
    setQ("");
    lists.current = {};
  }, [location.pathname, location.search]);
  useEffect(() => {
    const away = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    const hotkey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", hotkey);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", hotkey);
    };
  }, []);

  // ask the server a moment after the user stops typing
  useEffect(() => {
    if (term.length < MIN_CHARS) {
      setData({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const once = (key, url) => (lists.current[key] ||= api.get(url).then((r) => r.data));
      const safe = (promise) => promise.catch(() => []); // one failing list must not hide the others
      const [tasks, projects, daily, people, departments] = await Promise.all([
        safe(api.get("/tasks", { params: { search: escapeRegex(term), limit: PER_GROUP } }).then((r) => r.data.items)),
        safe(once("projects", "/projects")),
        safe(user.role === "superadmin" ? Promise.resolve([]) : once("daily", "/daily-work/today")),
        safe(
          manager
            ? api.get("/users", { params: { search: escapeRegex(term) } }).then((r) => r.data)
            : Promise.resolve([]),
        ),
        safe(manager ? once("departments", "/departments") : Promise.resolve([])),
      ]);
      if (cancelled) return;
      const dailyTasks = Array.isArray(daily) ? [] : [...(daily.overdueTasks || []), ...(daily.assignedTasks || [])];
      setData({
        tasks,
        projects: projects.filter((x) => has(x.name, term) || has(x.code, term) || has(x.description, term)),
        daily: dailyTasks.filter((x) => has(x.title, term) || has(x.description, term)),
        people,
        departments: departments.filter((x) => has(x.name, term) || has(x.code, term)),
      });
      setLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, manager, user.role]);

  // Build the groups shown in the dropdown. Every result: { key, title, meta, to }
  const groups = useMemo(() => {
    if (term.length < MIN_CHARS) return [];
    const withSearch = (path, text) => `${path}?search=${encodeURIComponent(text)}`;
    const g = [
      {
        name: "Pages",
        icon: "dashboards",
        items: links
          .filter((x) => has(x[1], term))
          .map((x) => ({ key: "p" + x[0], title: x[1], meta: "Open page", to: x[0] })),
      },
      {
        name: "Additional Tasks",
        icon: "clipboard-check",
        items: (data.tasks || []).map((x) => ({
          key: "t" + x._id,
          title: x.title,
          meta: [x.status?.replace("-", " "), x.project?.code, x.assignedTo?.name].filter(Boolean).join(" · "),
          to: withSearch("/tasks", x.title),
        })),
      },
      {
        name: "Daily Work",
        icon: "appointment",
        items: (data.daily || []).map((x) => ({
          key: "d" + x._id,
          title: x.title,
          meta: [(x.status === "todo" ? "pending" : x.status)?.replace("-", " "), x.dueTime && "Due " + x.dueTime]
            .filter(Boolean)
            .join(" · "),
          to: "/daily-work",
        })),
      },
      {
        name: "Projects",
        icon: "open-folder",
        items: (data.projects || []).map((x) => ({
          key: "j" + x._id,
          title: x.name,
          meta: [x.code, x.status].filter(Boolean).join(" · "),
          to: withSearch("/projects", x.name),
        })),
      },
      {
        name: "People",
        icon: "user",
        items: (data.people || []).map((x) => ({
          key: "u" + x._id,
          title: x.name,
          meta: [x.designation || x.role, x.department?.name].filter(Boolean).join(" · "),
          to: withSearch("/users", x.name),
        })),
      },
      {
        name: "Departments",
        icon: "building",
        items: (data.departments || []).map((x) => ({
          key: "g" + x._id,
          title: x.name,
          meta: x.code || "Department",
          to: "/departments",
        })),
      },
    ];
    return g.map((x) => ({ ...x, items: x.items.slice(0, PER_GROUP) })).filter((x) => x.items.length);
  }, [term, data, links]);
  const flat = groups.flatMap((x) => x.items);
  useEffect(() => setActive(0), [term]);

  const go = (item) => {
    if (!item) return;
    setOpen(false);
    setQ("");
    input.current?.blur();
    navigate(item.to);
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(flat[Math.min(active, flat.length - 1)]);
    }
  };

  const showPanel = open && term.length > 0;
  let index = -1;
  return (
    <div className="gsearch" ref={box}>
      <div className="search">
        <DIcon name="magnifying-glass" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search workspace..."
          aria-label="Search workspace"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="gsearch-results"
          autoComplete="off"
        />
        {q && (
          <button
            type="button"
            className="gsearch-clear"
            aria-label="Clear search"
            onClick={() => {
              setQ("");
              input.current?.focus();
            }}
          >
            <X />
          </button>
        )}
      </div>
      {showPanel && (
        <div className="gsearch-panel" id="gsearch-results" role="listbox">
          {term.length < MIN_CHARS ? (
            <p className="gsearch-note">Type at least {MIN_CHARS} letters to search.</p>
          ) : flat.length ? (
            groups.map((group) => (
              <div className="gsearch-group" key={group.name}>
                <h5>{group.name}</h5>
                {group.items.map((item) => {
                  index += 1;
                  const i = index;
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      key={item.key}
                      className={"gsearch-item" + (i === active ? " active" : "")}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                    >
                      <i>
                        <DIcon name={group.icon} />
                      </i>
                      <span>
                        <b>{item.title}</b>
                        {item.meta && <small>{item.meta}</small>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          ) : loading ? (
            <p className="gsearch-note">Searching...</p>
          ) : (
            <p className="gsearch-note">No results for "{q.trim()}".</p>
          )}
        </div>
      )}
    </div>
  );
}
