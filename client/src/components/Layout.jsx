import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  ClipboardList,
  ClipboardCheck,
  ShieldCheck,
  BarChart3,
  Settings,
  Menu,
  X,
  ClipboardEdit,
  ChevronDown,
  UserCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import { Modal, Badge, Button, DIcon, initials, roleLabel } from "./UI";

// [path, label, icon, roles]
// icon: a string = designer icon from /public/design/icons, otherwise a lucide icon component
const links = [
  ["/", "Dashboard", "dashboards"],
  ["/departments", "Departments", Building2, ["superadmin", "admin"]],
  ["/users", "People", Users, ["superadmin", "admin"]],
  ["/projects", "Projects", "open-folder"],
  ["/daily-work", "Daily Work", "appointment"],
  ["/daily-templates", "Daily Templates", ClipboardList, ["superadmin", "admin"]],
  ["/approvals", "Approvals", ClipboardCheck, ["superadmin", "admin"]],
  ["/attendance", "Attendance", "time"],
  ["/leave", "Leave", "airplane"],
  ["/calendar", "Calendar", "calendar"],
  ["/tasks", "Additional Tasks", "clipboard-check"],
  ["/reports", "Reports", BarChart3, ["superadmin", "admin"]],
  ["/notifications", "Notifications", "bell"],
  ["/audit", "Audit Logs", ShieldCheck, ["superadmin"]],
  ["/settings", "Settings", Settings, ["superadmin"]],
];
const extraTitles = { "/profile": "My Profile" };

const NavIcon = ({ icon: Icon }) =>
  typeof Icon === "string" ? <DIcon name={Icon} className="nav-icon" /> : <Icon className="nav-icon" />;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  const [assignPopup, setAssignPopup] = useState([]);
  const seenIds = useRef(new Set());
  const menuRef = useRef(null);
  const location = useLocation();
  const title =
    links.find((x) => x[0] === location.pathname)?.[1] || extraTitles[location.pathname] || "Ganesh Gauri Industries";
  const loadUnread = useCallback(
    () =>
      Promise.all([
        api.get("/notifications").then(({ data }) => setUnread(data.filter((x) => !x.read).length)),
        api.get("/notifications/pending-assignments").then(({ data }) => {
          const fresh = data.filter((x) => !seenIds.current.has(x._id));
          if (fresh.length) {
            fresh.forEach((x) => seenIds.current.add(x._id));
            setAssignPopup((prev) => [...fresh, ...prev]);
          }
        }),
      ]).catch((err) => console.error("Failed to load notifications", err)),
    [],
  );
  useEffect(() => {
    loadUnread();
    window.addEventListener("tf-refresh", loadUnread);
    return () => window.removeEventListener("tf-refresh", loadUnread);
  }, [loadUnread]);
  useEffect(() => {
    if (!menu) return;
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);
  useEffect(() => setMenu(false), [location.pathname]);
  const dismissAssignPopup = () => {
    const ids = assignPopup.map((x) => x._id);
    setAssignPopup([]);
    Promise.all(ids.map((id) => api.patch("/notifications/" + id + "/read")))
      .then(loadUnread)
      .catch(() => {});
  };
  const openAssignItem = (x) => {
    setAssignPopup((prev) => prev.filter((y) => y._id !== x._id));
    api
      .patch("/notifications/" + x._id + "/read")
      .then(loadUnread)
      .catch(() => {});
    navigate(x.link || "/notifications");
  };
  return (
    <div className="app-shell gp">
      <div className="gp-backdrop" aria-hidden="true" />
      {open && <button className="shell-backdrop mobile" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={"sidebar " + (open ? "open" : "")}>
        <div className="gp-brand">
          <img src="/design/logo-white.png" alt="Gouri Aqua Plast" />
          <button className="icon mobile" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <div className="gp-company">
          Ganesh Gauri
          <br />
          Industries
        </div>
        <nav>
          {links
            .filter((x) => !x[3] || x[3].includes(user.role))
            .map(([to, label, icon]) => (
              <NavLink end={to === "/"} key={to} to={to} onClick={() => setOpen(false)}>
                <NavIcon icon={icon} />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-user">
          <NavLink to="/profile" className="user-row" onClick={() => setOpen(false)}>
            <div className="gp-avatar">{initials(user.name)}</div>
            <div>
              <b>{user.name}</b>
              <span>{roleLabel(user.role)}</span>
            </div>
          </NavLink>
          <button onClick={logout} className="logout-btn">
            <DIcon name="logout" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main>
        <header>
          <button className="icon mobile" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="header-title">
            <p className="eyebrow">Workspace</p>
            <h2>{title}</h2>
          </div>
          <div className="header-actions">
            <div className="search">
              <DIcon name="magnifying-glass" />
              <input placeholder="Search workspace..." />
            </div>
            <NavLink className="icon notif-button" to="/notifications" aria-label="Notifications">
              <DIcon name="bell" />
              {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
            </NavLink>
            <div className="profile-menu" ref={menuRef}>
              <button className="profile-chip" onClick={() => setMenu((v) => !v)} aria-expanded={menu}>
                <span className="chip-avatar">{initials(user.name)}</span>
                <span className="chip-name">{user.name.split(" ")[0]}</span>
                <ChevronDown className="chip-caret" />
              </button>
              {menu && (
                <div className="profile-dropdown">
                  <NavLink to="/profile">
                    <UserCircle />
                    My profile
                  </NavLink>
                  <button onClick={logout}>
                    <LogOut />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page">
          <Outlet />
        </div>
      </main>
      {assignPopup.length > 0 && (
        <Modal title="Tasks needing your attention" onClose={dismissAssignPopup}>
          <div className="form-grid">
            <p className="muted">
              You have {assignPopup.length} item{assignPopup.length > 1 ? "s" : ""} that need action.
            </p>
            <div className="stack-fields">
              {assignPopup.map((x) => (
                <article key={x._id} className="task-card" onClick={() => openAssignItem(x)}>
                  <div className="row wrap">
                    <Badge tone={x.type.startsWith("daily") ? "purple" : "blue"}>
                      {x.type.startsWith("daily") ? "Daily Work" : "Additional Task"}
                    </Badge>
                    {x.type.endsWith("rework") && <Badge tone="orange">Needs changes</Badge>}
                  </div>
                  <h3>{x.title}</h3>
                  <p>{x.message}</p>
                </article>
              ))}
            </div>
            <div className="form-actions">
              <Button variant="primary full" onClick={dismissAssignPopup}>
                <ClipboardEdit />
                Got it, close for now
              </Button>
            </div>
            <p className="muted" style={{ fontSize: ".8rem", textAlign: "center" }}>
              This will keep showing on login until the task is submitted.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
