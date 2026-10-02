import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context";
import { Building2, Mail, BriefcaseBusiness, UserCog } from "lucide-react";
import { DIcon } from "../components/UI";
import toast from "react-hot-toast";
import "../login.css";

const REMEMBER_KEY = "tf_remember_login"; // only the email / mobile number is remembered, never the password

// Solid shield with a tick (used in the card tile and the "Secure Access" feature)
const Shield = ({ color = "currentColor", tick = "#fff" }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill={color}
      d="M12 1.8 3.6 5v6.2c0 5.1 3.4 9.5 8.4 11 5-1.5 8.4-5.9 8.4-11V5L12 1.8Z"
      stroke={color}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="m8.3 12.1 2.6 2.6 4.9-5.2"
      fill="none"
      stroke={tick}
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Solid eye (password visible) / crossed eye (hidden)
const EyeIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 5.2C6.6 5.2 2.6 9 1.2 12c1.4 3 5.4 6.8 10.8 6.8S21.400 15 22.800 12C21.400 9 17.400 5.200 12 5.200Z"
    />
    <circle cx="12" cy="12" r="4.3" fill="none" stroke="#fff" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="1.9" fill="#fff" />
    {off && <path d="M4 3.500 20 20.500" stroke="#fff" strokeWidth="4" strokeLinecap="round" />}
    {off && <path d="M4 3.500 20 20.500" stroke="currentColor" strokeWidth="1.900" strokeLinecap="round" />}
  </svg>
);

const features = [
  ["group", "Team", "Management"],
  ["new-project", "Project", "Tracking"],
  ["settings", "Operational", "Efficiency"],
  [null, "Secure", "Access"],
];

// Text input with an icon on the left (and an optional button on the right)
function IconField({ label, icon, children, action }) {
  return (
    <label className="lg-field">
      <span>{label}</span>
      <div className="lg-input">
        <i className="lg-input-icon">{icon}</i>
        {children}
        {action}
      </div>
    </label>
  );
}

export default function Login() {
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [showPassword, setShowPassword] = useState(false),
    [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_KEY)),
    [deps, setDeps] = useState([]),
    [depsLoading, setDepsLoading] = useState(false),
    [depsError, setDepsError] = useState(false);
  const [form, setForm] = useState({
    name: "",
    emailOrPhone: localStorage.getItem(REMEMBER_KEY) || "",
    password: "",
    role: "employee",
    department: "",
    designation: "",
  });
  const { login, setUser } = useAuth(),
    nav = useNavigate();
  useEffect(() => {
    if (mode !== "register" || form.role !== "employee") return;
    setDepsLoading(true);
    setDepsError(false);
    api
      .get("/auth/departments")
      .then((r) => setDeps(r.data))
      .catch(() => {
        setDeps([]);
        setDepsError(true);
      })
      .finally(() => setDepsLoading(false));
  }, [mode, form.role]);
  const patch = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const patchRole = (e) =>
    setForm({ ...form, role: e.target.value, department: e.target.value === "admin" ? "" : form.department });
  const switchMode = (next) => {
    setMode(next);
    setShowPassword(false);
    if (next === "register")
      setForm({ ...form, name: "", emailOrPhone: "", password: "", role: "employee", department: "", designation: "" });
    if (next === "login") setForm({ ...form, emailOrPhone: localStorage.getItem(REMEMBER_KEY) || "", password: "" });
  };
  const getSubmitData = () => {
    const val = form.emailOrPhone.trim();
    const isEmail = val.includes("@");
    return isEmail ? { ...form, email: val, phone: "" } : { ...form, email: "", phone: val };
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "reset") {
        await api.post("/auth/forgot-password", { email: form.emailOrPhone });
        toast.success("Reset link sent to email.");
      } else if (mode === "register") {
        const data = getSubmitData();
        const { data: res } = await api.post("/auth/register", data);
        localStorage.setItem("tf_token", res.token);
        localStorage.setItem("tf_user", JSON.stringify(res.user));
        setUser(res.user);
        toast.success(`${res.user.role === "admin" ? "Admin" : "Employee"} account registered`);
        nav("/");
      } else {
        await login(form.emailOrPhone, form.password);
        if (remember) localStorage.setItem(REMEMBER_KEY, form.emailOrPhone.trim());
        else localStorage.removeItem(REMEMBER_KEY);
        nav("/");
      }
    } catch (e) {
      toast.error(
        e.response?.data?.message ||
          (mode === "reset" ? "Reset request failed" : mode === "register" ? "Registration failed" : "Login failed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "register" ? "Create account" : mode === "reset" ? "Reset password" : "Welcome back";
  const subtitle =
    mode === "register"
      ? "Admins create their own department after signup. Employees join an existing department."
      : mode === "reset"
        ? "Enter your account email to generate a reset link."
        : "Sign in with your registered mobile number and password to access your workspace";
  const submitLabel = busy
    ? mode === "register"
      ? "Creating..."
      : mode === "reset"
        ? "Generating..."
        : "Signing in..."
    : mode === "register"
      ? "Create account"
      : mode === "reset"
        ? "Generate reset link"
        : "Sign In";

  return (
    <div className="lg">
      {/* blue waves at the bottom of the page */}
      <svg className="lg-wave" viewBox="0 0 1806 330" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="lgBack" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#1759cf" />
            <stop offset="0.5" stopColor="#3a7ae4" />
            <stop offset="1" stopColor="#4a8cee" />
          </linearGradient>
          <linearGradient id="lgFront" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#2e49de" />
            <stop offset="0.55" stopColor="#2c50d5" />
            <stop offset="1" stopColor="#2760cc" />
          </linearGradient>
        </defs>
        <path
          fill="url(#lgBack)"
          d="M0 56 C 60 44 110 52 170 86 C 330 150 620 150 800 112 C 900 90 960 74 1040 80 C 1160 90 1260 150 1420 196 C 1560 236 1700 246 1806 236 L 1806 330 L 0 330 Z"
        />
        <path
          fill="url(#lgFront)"
          d="M0 118 C 140 128 300 190 560 196 C 760 200 900 176 1040 178 C 1180 180 1300 214 1806 300 L 1806 330 L 0 330 Z"
        />
        <path
          fill="#5b97f6"
          d="M1340 330 C 1480 268 1640 236 1806 232 L 1806 300 C 1700 318 1600 326 1560 330 Z"
          opacity="0.9"
        />
        <path
          fill="none"
          stroke="#fff"
          strokeOpacity="0.55"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          d="M905 330 C 1060 276 1210 254 1340 262 C 1500 272 1660 310 1806 296"
        />
      </svg>

      <section className="lg-hero" aria-label="Gouri Aqua Plast">
        <img className="lg-logo" src="/design/logo-blue.png" alt="Gouri Aqua Plast" />
        <h1>
          <span>One Workspace</span>
          <br />
          For A Stronger
          <br />
          Tomorrow.
        </h1>
        <p>Manage your teams, projects, approvals and operations - all in one secure platform.</p>
        <div className="lg-stage">
          <svg className="lg-podium" viewBox="0 0 880 130" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="lgSide" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#3566c2" />
                <stop offset="1" stopColor="#2e4fd6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lgTop" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#8fb0e4" />
                <stop offset="1" stopColor="#cddcf3" />
              </linearGradient>
            </defs>
            <path fill="url(#lgSide)" d="M10 50 L10 130 L870 130 L870 50 Z" />
            <ellipse cx="440" cy="50" rx="430" ry="48" fill="url(#lgTop)" />
          </svg>
          <img
            className="lg-products"
            src="/design/login/products.webp"
            alt="Gouri Aqua Plast tanks, pipes and fittings"
          />
        </div>
        <ul className="lg-features">
          {features.map(([icon, a, b]) => (
            <li key={a}>
              <i>{icon ? <DIcon name={icon} /> : <Shield color="#fff" tick="#3f6fe0" />}</i>
              <span>
                {a}
                <br />
                {b}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <main className="lg-panel">
        <form className="lg-card" onSubmit={submit}>
          <img className="lg-card-logo" src="/design/logo-blue.png" alt="Gouri Aqua Plast" />
          <div className="lg-card-top">
            <div className="lg-tile">
              {mode === "register" ? <DIcon name="user-add" /> : mode === "reset" ? <DIcon name="lock" /> : <Shield />}
            </div>
            <span className="lg-secure">
              <DIcon name="lock" />
              Secured access
            </span>
          </div>
          <h2>{title}</h2>
          <p className="lg-sub">{subtitle}</p>

          {mode === "register" && (
            <IconField label="Full name" icon={<DIcon name="user" />}>
              <input value={form.name} onChange={patch("name")} placeholder="Your full name" required />
            </IconField>
          )}
          {mode !== "reset" ? (
            <IconField
              label={mode === "register" ? "Email or phone" : "Email or mobile number"}
              icon={<DIcon name="user" />}
            >
              <input
                type="text"
                autoComplete="username"
                value={form.emailOrPhone}
                onChange={patch("emailOrPhone")}
                placeholder="Email or 10 digit mobile number"
                required
              />
            </IconField>
          ) : (
            <IconField label="Email" icon={<Mail />}>
              <input
                type="email"
                value={form.emailOrPhone}
                onChange={patch("emailOrPhone")}
                placeholder="Your account email"
                required
              />
            </IconField>
          )}
          {mode !== "reset" && (
            <IconField
              label="Password"
              icon={<DIcon name="lock" />}
              action={
                <button
                  type="button"
                  className="lg-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon off={showPassword} />
                </button>
              }
            >
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={form.password}
                onChange={patch("password")}
                placeholder="Enter your password"
                minLength="8"
                required
              />
            </IconField>
          )}
          {mode === "register" && (
            <>
              <IconField label="Register as" icon={<UserCog />}>
                <select value={form.role} onChange={patchRole}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </IconField>
              {form.role === "employee" && (
                <IconField label="Department" icon={<DIcon name="building" />}>
                  <select value={form.department} onChange={patch("department")} required>
                    <option value="">
                      {depsLoading
                        ? "Loading departments..."
                        : depsError
                          ? "Unable to load departments"
                          : deps.length
                            ? "Select department"
                            : "No active departments available"}
                    </option>
                    {deps.map((x) => (
                      <option key={x._id} value={x._id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </IconField>
              )}
              {form.role === "admin" && (
                <div className="lg-note">
                  <Building2 />
                  <span>You will create your department after login.</span>
                </div>
              )}
              <IconField label="Designation" icon={<BriefcaseBusiness />}>
                <input
                  value={form.designation}
                  onChange={patch("designation")}
                  placeholder={form.role === "admin" ? "Manager" : "Employee"}
                />
              </IconField>
            </>
          )}

          {mode === "login" && (
            <div className="lg-row">
              <label className="lg-check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <i />
                Remember me
              </label>
              <button type="button" className="lg-link" onClick={() => switchMode("reset")}>
                Forgot password?
              </button>
            </div>
          )}

          <button className="lg-submit" disabled={busy}>
            {submitLabel}
            <DIcon name="right-arrow" />
          </button>
          {mode === "reset" && (
            <p className="lg-hint">
              Already have a token? <Link to="/reset-password">Open reset page</Link>
            </p>
          )}

          <div className="lg-or">
            <span>or</span>
          </div>
          <div className="lg-alt">
            {mode === "login" ? (
              <button type="button" onClick={() => switchMode("register")}>
                Register
              </button>
            ) : (
              <button type="button" onClick={() => switchMode("login")}>
                Back to sign in
              </button>
            )}
            {mode === "reset" ? (
              <button type="button" onClick={() => switchMode("register")}>
                Register
              </button>
            ) : (
              <div className="lg-chip">
                <DIcon name="building" />
                Enterprise workspace
              </div>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
