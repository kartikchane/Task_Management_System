import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import api, { errMsg } from "../../../src/api";
import { useAuth } from "../../../src/auth";
import { toast } from "../../../src/toast";
import { BackHeader, Screen } from "../../../src/components/layout";
import { Btn, Card, Field, TextField } from "../../../src/components/ui";
import { F, fs, u } from "../../../src/theme";

// Screen-11: Change Password
export default function Password() {
  const router = useRouter();
  const { user } = useAuth();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!f.current || !f.next) return toast.error("Fill in all password fields");
    if (f.next.length < 8) return toast.error("New password must be at least 8 characters");
    if (f.next !== f.confirm) return toast.error("New passwords don't match");
    setBusy(true);
    try {
      await api.patch("/auth/password", { currentPassword: f.current, newPassword: f.next });
      toast.success("Password changed");
      setF({ current: "", next: "", confirm: "" });
      router.back();
    } catch (e) {
      toast.error(errMsg(e, "Unable to change password"));
    } finally {
      setBusy(false);
    }
  };
  const forgot = async () => {
    if (!user.email) return toast.error("Your account has no email. Ask your admin to reset your password.");
    try {
      await api.post("/auth/forgot-password", { email: user.email });
      toast.success("Reset link sent to " + user.email);
    } catch (e) {
      toast.error(errMsg(e, "Unable to send reset link"));
    }
  };
  return (
    <Screen header={<BackHeader title="Change Password" search />} keyboard>
      <Card style={cs.card}>
        <Pressable onPress={() => router.back()} hitSlop={6}>
          <Text style={cs.link}>Back to settings</Text>
        </Pressable>
        <Text style={cs.h2}>Change your password</Text>
        <Text style={cs.help}>For a strong password, try choosing a unique phrase that you don't use on any other accounts.</Text>
        <Field label="Current password" style={{ marginTop: u(40) }}>
          <TextField value={f.current} onChangeText={set("current")} secureTextEntry autoCapitalize="none" textContentType="password" />
        </Field>
        <Pressable onPress={forgot} hitSlop={6} style={{ marginTop: u(16), alignSelf: "flex-start" }}>
          <Text style={cs.link}>Forgot your password?</Text>
        </Pressable>
        <Field label="New password" style={{ marginTop: u(36) }}>
          <TextField value={f.next} onChangeText={set("next")} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
        </Field>
        <Field label="Confirm new password">
          <TextField value={f.confirm} onChangeText={set("confirm")} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
        </Field>
        <Btn title="Save" variant="black" pill loading={busy} onPress={save} style={{ alignSelf: "flex-start", marginTop: u(48), paddingHorizontal: u(34) }} textStyle={{ fontSize: fs(30), fontFamily: F.r }} />
      </Card>
    </Screen>
  );
}

const cs = StyleSheet.create({
  card: { borderRadius: u(14), paddingHorizontal: u(32), paddingTop: u(34), paddingBottom: u(32) },
  link: { fontFamily: F.r, fontSize: fs(23), color: "#000", textDecorationLine: "underline" },
  h2: { fontFamily: F.s, fontSize: fs(38), color: "#000", marginTop: u(18) },
  help: { fontFamily: F.r, fontSize: fs(21), color: "#111", marginTop: u(24), marginLeft: u(36), lineHeight: u(34) },
});
