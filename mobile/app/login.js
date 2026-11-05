import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IMAGES } from "../src/assets";
import api, { DEFAULT_API, errMsg, getApiBase, setApiBase } from "../src/api";
import { REMEMBER, SERVER_KEY, useAuth } from "../src/auth";
import { store } from "../src/storage";
import { toast } from "../src/toast";
import { Btn, Dialog, Icon, Select } from "../src/components/ui";
import { C, F } from "../src/theme";

// Screen-3 of the design: sign in, plus register and forgot password in the same card.
export default function Login() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const k = Math.min(width, 520) / 882;
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [server, setServer] = useState(false);
  const [deps, setDeps] = useState([]);
  const [f, setF] = useState({ name: "", emailOrPhone: "", password: "", role: "employee", department: "", designation: "" });
  const set = (key) => (v) => setF((x) => ({ ...x, [key]: v }));

  useEffect(() => {
    store.get(REMEMBER).then((v) => {
      if (v) {
        setRemember(true);
        setF((x) => ({ ...x, emailOrPhone: v }));
      }
    });
  }, []);
  useEffect(() => {
    if (mode !== "register" || f.role !== "employee") return;
    api
      .get("/auth/departments")
      .then((r) => setDeps(r.data))
      .catch(() => setDeps([]));
  }, [mode, f.role]);

  const switchMode = async (next) => {
    setMode(next);
    setShow(false);
    if (next === "register") setF({ name: "", emailOrPhone: "", password: "", role: "employee", department: "", designation: "" });
    if (next === "login") setF((x) => ({ ...x, password: "" }));
  };

  const submit = async () => {
    const id = f.emailOrPhone.trim();
    if (!id || (mode !== "reset" && !f.password)) return toast.error("Please fill in all fields");
    if (mode !== "reset" && f.password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      if (mode === "reset") {
        await api.post("/auth/forgot-password", { email: id });
        toast.success("Reset link sent to your email");
        setMode("login");
      } else if (mode === "register") {
        if (!f.name.trim()) throw { message: "Enter your full name" };
        if (f.role === "employee" && !f.department) throw { message: "Select your department" };
        const isEmail = id.includes("@");
        await register({ ...f, emailOrPhone: id, email: isEmail ? id : "", phone: isEmail ? "" : id });
        toast.success("Account created");
      } else {
        await login(id, f.password);
        await store.set(REMEMBER, remember ? id : null);
      }
    } catch (e) {
      toast.error(e?.response || e?.isAxiosError ? errMsg(e, "Login failed") : e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "register" ? "Create account" : mode === "reset" ? "Reset password" : "Welcome back";
  const subtitle =
    mode === "register"
      ? "Admins create their own department after signup. Employees join an existing department."
      : mode === "reset"
        ? "Enter your account email to get a password reset link."
        : "Sign in with your registered mobile number and password to access your workspace";

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <Image source={IMAGES.introPhoto} style={{ position: "absolute", left: 0, top: 600 * (width / 882), width, height: 1020 * (width / 882), opacity: 0.2 }} contentFit="cover" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 90 * k, paddingBottom: insets.bottom + 40, paddingHorizontal: 25 * k, alignItems: "center" }}
        >
          <Image source={IMAGES.logo} style={{ width: 529 * k, height: 151 * k }} contentFit="contain" />
          <View style={[ls.card, { marginTop: 135 * k, borderRadius: 30 * k, paddingHorizontal: 70 * k, paddingTop: 50 * k, paddingBottom: 58 * k, maxWidth: 520 }]}>
            <LinearGradient
              colors={["#3b40ef", "#3454ea", "#15a3a1", "#b9a730", "#e19802"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: 21 * k }}
            />
            <View style={ls.topRow}>
              <View style={[ls.tile, { width: 98 * k, height: 95 * k, borderRadius: 20 * k }]}>
                <Icon name={mode === "register" ? "user-add" : mode === "reset" ? "lock" : "shield-copy"} size={48 * k} color="#484deb" />
              </View>
              <View style={[ls.secure, { height: 57 * k, paddingHorizontal: 20 * k, gap: 14 * k, marginTop: 15 * k }]}>
                <Icon name="lock" size={28 * k} color={C.subtle} />
                <Text style={[ls.secureText, { fontSize: Math.max(11, 21 * k) }]}>Secured access</Text>
              </View>
            </View>
            <Text style={[ls.h1, { fontSize: 56 * k, marginTop: 44 * k }]}>{title}</Text>
            <Text style={[ls.sub, { fontSize: Math.max(12.5, 30 * k), lineHeight: Math.max(16, 35 * k) }]}>{subtitle}</Text>

            {mode === "register" && (
              <LField k={k} label="Full name" icon="user">
                <TextInput value={f.name} onChangeText={set("name")} placeholder="Your full name" placeholderTextColor="#7c8295" style={[ls.input, { fontSize: Math.max(13, 26 * k) }]} />
              </LField>
            )}
            <LField k={k} first={mode !== "register"} label={mode === "reset" ? "Email" : mode === "register" ? "Email or phone" : "Email or mobile number"} icon={mode === "reset" ? null : "user"} ionicon={mode === "reset" ? "mail" : null}>
              <TextInput
                value={f.emailOrPhone}
                onChangeText={set("emailOrPhone")}
                placeholder={mode === "reset" ? "Your account email" : "Email or 10 digit mobile number"}
                placeholderTextColor="#7c8295"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={mode === "reset" ? "email-address" : "default"}
                textContentType="username"
                style={[ls.input, { fontSize: Math.max(13, 26 * k) }]}
              />
            </LField>
            {mode !== "reset" && (
              <LField
                k={k}
                label="Password"
                icon="lock"
                action={
                  <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} style={{ paddingHorizontal: 18 * k }} accessibilityLabel={show ? "Hide password" : "Show password"}>
                    <Icon name="eye" size={48 * k} color={show ? C.navy : C.subtle} />
                  </Pressable>
                }
              >
                <TextInput
                  value={f.password}
                  onChangeText={set("password")}
                  placeholder="Enter your password"
                  placeholderTextColor="#7c8295"
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  textContentType={mode === "register" ? "newPassword" : "password"}
                  onSubmitEditing={submit}
                  style={[ls.input, { fontSize: Math.max(13, 26 * k) }]}
                />
              </LField>
            )}
            {mode === "register" && (
              <>
                <Text style={[ls.label, { fontSize: Math.max(12.5, 25 * k), marginTop: 30 * k }]}>Register as</Text>
                <Select
                  value={f.role}
                  onChange={(v) => setF((x) => ({ ...x, role: v, department: v === "admin" ? "" : x.department }))}
                  options={[
                    { value: "employee", label: "Employee" },
                    { value: "admin", label: "Admin" },
                  ]}
                  title="Register as"
                />
                {f.role === "employee" ? (
                  <>
                    <Text style={[ls.label, { fontSize: Math.max(12.5, 25 * k), marginTop: 30 * k }]}>Department</Text>
                    <Select
                      value={f.department}
                      onChange={set("department")}
                      options={deps.map((d) => ({ value: d._id, label: d.name }))}
                      placeholder={deps.length ? "Select department" : "No departments available"}
                      title="Department"
                    />
                  </>
                ) : (
                  <View style={ls.note}>
                    <Ionicons name="business" size={16} color={C.navy} />
                    <Text style={ls.noteText}>You will create your department after login.</Text>
                  </View>
                )}
                <LField k={k} label="Designation" ionicon="briefcase">
                  <TextInput
                    value={f.designation}
                    onChangeText={set("designation")}
                    placeholder={f.role === "admin" ? "Manager" : "Employee"}
                    placeholderTextColor="#7c8295"
                    style={[ls.input, { fontSize: Math.max(13, 26 * k) }]}
                  />
                </LField>
              </>
            )}

            {mode === "login" && (
              <View style={[ls.row, { marginTop: 26 * k }]}>
                <Pressable onPress={() => setRemember((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 17 * k }} hitSlop={6}>
                  <View style={[ls.check, { width: 37 * k, height: 37 * k, borderRadius: 9 * k }, remember && { backgroundColor: "#484deb" }]}>
                    {remember && <Ionicons name="checkmark" size={26 * k} color="#fff" />}
                  </View>
                  <Text style={[ls.rowText, { fontSize: Math.max(12.5, 25 * k) }]}>Remember me</Text>
                </Pressable>
                <Pressable onPress={() => switchMode("reset")} hitSlop={6}>
                  <Text style={[ls.link, { fontSize: Math.max(12.5, 25 * k) }]}>Forgot password?</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={submit}
              disabled={busy}
              style={({ pressed }) => [ls.submit, { height: 82 * k, marginTop: 34 * k, gap: 24 * k, borderRadius: 6 * k }, (pressed || busy) && { opacity: 0.8 }]}
            >
              <Text style={[ls.submitText, { fontSize: Math.max(15, 34 * k) }]}>
                {busy ? "Please wait..." : mode === "register" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign In"}
              </Text>
              <Icon name="right-arrow" size={40 * k} color="#fff" />
            </Pressable>

            <View style={[ls.or, { marginTop: 22 * k, marginBottom: 46 * k }]}>
              <View style={ls.orLine} />
              <Text style={[ls.orText, { fontSize: Math.max(14, 32 * k), marginHorizontal: 22 * k }]}>or</Text>
              <View style={ls.orLine} />
            </View>
            <View style={{ flexDirection: "row", gap: 22 * k }}>
              <Pressable
                onPress={() => switchMode(mode === "login" ? "register" : "login")}
                style={({ pressed }) => [ls.alt, { height: 76 * k, borderRadius: 14 * k }, pressed && { backgroundColor: "#f6f8ff" }]}
              >
                <Text style={[ls.altText, { color: "#172cb4", fontSize: Math.max(12, 22 * k) }]}>{mode === "login" ? "Register" : "Back to sign in"}</Text>
              </Pressable>
              <Pressable onPress={() => setServer(true)} style={({ pressed }) => [ls.alt, { height: 76 * k, borderRadius: 14 * k, gap: 8 * k }, pressed && { backgroundColor: "#f6f8ff" }]}>
                <Icon name="building" size={30 * k} color="#33aba4" />
                <Text style={[ls.altText, { color: "#52526c", fontSize: Math.max(12, 22 * k) }]} numberOfLines={1}>
                  Enterprise workspace
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ServerDialog visible={server} onClose={() => setServer(false)} />
    </View>
  );
}

function LField({ k, label, icon, ionicon, children, action, first }) {
  return (
    <View style={{ marginTop: first ? 72 * k : 30 * k }}>
      <Text style={[ls.label, { fontSize: Math.max(12.5, 25 * k) }]}>{label}</Text>
      <View style={[ls.box, { height: 82 * k, minHeight: 44, borderRadius: 7 * k }]}>
        <View style={{ width: 92 * k, alignItems: "center" }}>
          {icon ? <Icon name={icon} size={40 * k} color={C.subtle} /> : <Ionicons name={ionicon} size={36 * k} color={C.subtle} />}
        </View>
        {children}
        {action}
      </View>
    </View>
  );
}

// "Enterprise workspace": change which server (company workspace) the app talks to.
function ServerDialog({ visible, onClose }) {
  const [value, setValue] = useState(getApiBase());
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (visible) setValue(getApiBase());
  }, [visible]);
  const save = async () => {
    let v = value.trim().replace(/\/+$/, "");
    if (!/^https?:\/\//.test(v)) v = "https://" + v;
    if (!/\/api$/.test(v)) v += "/api";
    setChecking(true);
    const old = getApiBase();
    setApiBase(v);
    try {
      await api.get("/auth/departments");
      await store.set(SERVER_KEY, v);
      toast.success("Workspace connected");
      onClose();
    } catch (e) {
      setApiBase(old);
      toast.error(e.response ? errMsg(e, "That address is not a TaskFlow server") : "Can't reach that address");
    } finally {
      setChecking(false);
    }
  };
  return (
    <Dialog visible={visible} onClose={onClose} title="Enterprise workspace">
      <Text style={{ fontFamily: F.r, fontSize: 14, color: "#555b6b", lineHeight: 20 }}>
        Your company's TaskFlow server address. You only need to change this if your admin gave you a different one.
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://your-server.com/api"
        style={{ marginTop: 14, borderWidth: 1, borderColor: "#e0e2e8", borderRadius: 10, paddingHorizontal: 12, height: 46, fontFamily: F.r, fontSize: 14 }}
      />
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Btn title="Reset" variant="outline" small style={{ flex: 1 }} onPress={() => setValue(DEFAULT_API)} />
        <Btn title="Save" small style={{ flex: 1 }} loading={checking} onPress={save} />
      </View>
    </Dialog>
  );
}

const ls = StyleSheet.create({
  card: { backgroundColor: "#fff", width: "100%", overflow: "hidden" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  tile: { backgroundColor: "#edecfd", alignItems: "center", justifyContent: "center" },
  secure: { flexDirection: "row", alignItems: "center", borderRadius: 999, backgroundColor: "#f6f8fc", borderWidth: 1, borderColor: "#e1e5ee" },
  secureText: { fontFamily: F.r, color: C.subtle },
  h1: { fontFamily: F.b, color: "#000" },
  sub: { fontFamily: F.r, color: C.subtle, marginTop: 4 },
  label: { fontFamily: F.s, color: "#000", marginBottom: 10 },
  box: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#e0e2e8", backgroundColor: "#fff" },
  input: { flex: 1, height: "100%", fontFamily: F.r, color: "#111", minWidth: 0, outlineStyle: "none" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowText: { fontFamily: F.r, color: "#000" },
  check: { borderWidth: 2, borderColor: "#484deb", alignItems: "center", justifyContent: "center" },
  link: { fontFamily: F.r, color: "#103edf", textDecorationLine: "underline" },
  submit: {
    backgroundColor: C.signIn,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.signIn,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  submitText: { fontFamily: F.r, color: "#fff" },
  or: { flexDirection: "row", alignItems: "center" },
  orLine: { flex: 1, height: 2, backgroundColor: "#d0d2e5" },
  orText: { fontFamily: F.r, color: "#858585" },
  alt: { flex: 1, minHeight: 40, borderWidth: 2, borderColor: "#d0d2e5", alignItems: "center", justifyContent: "center", flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 4 },
  altText: { fontFamily: F.r },
  note: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: "#eef3ff" },
  noteText: { fontFamily: F.r, fontSize: 13, color: C.navy, flex: 1 },
});
