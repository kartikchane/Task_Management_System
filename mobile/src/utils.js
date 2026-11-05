import { Alert, Platform } from "react-native";

// "Wednesday, 09 September 2026"
export const longDate = (d = new Date()) =>
  `${d.toLocaleDateString("en-IN", { weekday: "long" })}, ${String(d.getDate()).padStart(2, "0")} ${d.toLocaleDateString("en-IN", { month: "long" })} ${d.getFullYear()}`;
// calendar date in the phone's own time zone, e.g. 2026-09-09
export const localIso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => localIso(new Date());
export const time = (v) => (v ? new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-");
export const dateTime = (v) => (v ? new Date(v).toLocaleString("en-IN") : "");
export const shortDate = (v) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");
export const label = (s) => {
  const t = String(s || "").replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase() || "?";
export const roleLabel = (r) => ({ superadmin: "Super Admin", admin: "Admin", employee: "Employee" })[r] || r;

// Ask yes / no. Works on phones (Alert) and in the web preview (window.confirm).
export const confirm = (title, message, okText = "OK", destructive = false) =>
  new Promise((resolve) => {
    if (Platform.OS === "web") return resolve(window.confirm(`${title}\n\n${message || ""}`));
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: okText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });

export const statusTone = {
  todo: "muted",
  pending: "orange",
  "in-progress": "blue",
  submitted: "purple",
  approved: "green",
  completed: "green",
  rework: "orange",
  overdue: "red",
  rejected: "red",
  cancelled: "muted",
  present: "green",
  late: "orange",
  "half-day": "orange",
  absent: "red",
  leave: "purple",
  holiday: "blue",
};
