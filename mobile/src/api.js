import axios from "axios";

// Backend address. Set EXPO_PUBLIC_API_URL in mobile/.env, or change it inside the app
// (login screen > "Enterprise workspace").
export const DEFAULT_API = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");

let base = DEFAULT_API;
let token = null;
let onUnauthorized = () => {};

const api = axios.create({ timeout: 25000 });
api.interceptors.request.use((c) => {
  c.baseURL = base;
  if (token) c.headers.Authorization = `Bearer ${token}`;
  return c;
});
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && token) onUnauthorized();
    return Promise.reject(e);
  },
);

export const setToken = (t) => (token = t);
export const getToken = () => token;
export const setApiBase = (b) => (base = (b || DEFAULT_API).trim().replace(/\/+$/, ""));
export const getApiBase = () => base;
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);
export const serverOrigin = () => base.replace(/\/api$/, "");
export const fileUrl = (url) => (!url ? null : /^https?:\/\//.test(url) ? url : serverOrigin() + url);
export const attachmentUrl = (a) =>
  `${serverOrigin()}/api/attachments/view?url=${encodeURIComponent(a.url)}&name=${encodeURIComponent(a.name || "file")}`;

// The server searches with a regular expression, so ( ) + ? etc. must be escaped first.
export const escapeRegex = (text = "") => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const errMsg = (e, fallback = "Something went wrong") => {
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.message === "Network Error" || e?.code === "ECONNABORTED")
    return "Can't reach the server. Check your internet connection or the workspace address.";
  return fallback;
};

export default api;
