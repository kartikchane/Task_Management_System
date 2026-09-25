import { X } from "lucide-react";
import { Link } from "react-router-dom";

export const Badge = ({ children, tone = "" }) => <span className={"badge " + tone}>{children}</span>;
export const Button = ({ children, variant = "", ...p }) => (
  <button className={"btn " + variant} {...p}>
    {children}
  </button>
);
export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={"modal " + (wide ? "wide" : "")} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Empty state. Pass `image` (a file name from /public/design/illustrations, without .png)
 * to show one of the designer's illustrations instead of the small ✦ mark.
 */
export const Empty = ({
  title = "Nothing here",
  text = "Create your first record to get started.",
  image,
  compact = false,
}) => (
  <div className={"empty" + (image ? " with-image" : "") + (compact ? " compact" : "")}>
    {image ? <img src={`/design/illustrations/${image}.png`} alt="" /> : <div>✦</div>}
    <h3>{title}</h3>
    <p>{text}</p>
  </div>
);
export const Field = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);
export function Skeleton() {
  return (
    <div className="grid cols-4">
      {[1, 2, 3, 4].map((x) => (
        <div className="card skeleton" key={x} />
      ))}
    </div>
  );
}

/* ───────────── Design-system pieces (Gouri Aqua Plast theme) ───────────── */

/**
 * Icon from the designer's icon set (files in /public/design/icons).
 * The PNG is used as a mask, so the icon takes the current text colour.
 * <DIcon name="checklist" size={40} />
 */
export const DIcon = ({ name, size, className = "", style }) => (
  <span
    aria-hidden="true"
    className={"dicon " + className}
    style={{ "--icon": `url(/design/icons/${name}.png)`, width: size, height: size, ...style }}
  />
);

// "Wednesday, 09 September 2026"
export const todayLabel = (date = new Date()) =>
  `${date.toLocaleDateString("en-IN", { weekday: "long" })}, ${String(date.getDate()).padStart(2, "0")} ${date.toLocaleDateString("en-IN", { month: "long" })} ${date.getFullYear()}`;

export const DateChip = () => (
  <div className="date-chip">
    <DIcon name="calendar" />
    {todayLabel()}
  </div>
);

/** Page title area that sits on the factory photo. `children` go on the right, before the date chip. */
export function PageHead({ title, subtitle, children, date = true }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {(children || date) && (
        <div className="page-head-side">
          {children}
          {date && <DateChip />}
        </div>
      )}
    </div>
  );
}

/**
 * Stat card with the coloured side bar + tinted icon tile.
 * tone: blue | green | orange | purple | red
 * icon: a DIcon name (string) or any React element
 */
export function StatCard({ label, value, sub = "Live data", icon, tone = "blue", to }) {
  const body = (
    <>
      <i className="stat-bar" />
      <div className="stat-tile">{typeof icon === "string" ? <DIcon name={icon} /> : icon}</div>
      <div className="stat-text">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </>
  );
  const cls = "stat-card tone-" + tone;
  return to ? (
    <Link className={cls} to={to}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase() || "?";

export const roleLabel = (role = "") =>
  ({ superadmin: "Super Admin", admin: "Admin", employee: "Employee" })[role] || role;
