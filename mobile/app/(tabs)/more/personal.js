import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api, { errMsg } from "../../../src/api";
import { useAuth } from "../../../src/auth";
import { pickFile, uploadFile } from "../../../src/files";
import { toast } from "../../../src/toast";
import { Avatar, BackHeader, Screen } from "../../../src/components/layout";
import { Btn, Card, Field, TextField } from "../../../src/components/ui";
import { C, F, fs, u } from "../../../src/theme";
import { roleLabel } from "../../../src/utils";

// Screen-10: Personal Information (editable; photo upload)
export default function Personal() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({
    name: user.name || "",
    designation: user.designation || "",
    phone: user.phone || "",
    skills: (user.skills || []).join(", "),
  });
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!f.name.trim()) return toast.error("Name can't be empty");
    setBusy(true);
    try {
      const skills = f.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const { data } = await api.patch("/auth/profile", { name: f.name.trim(), designation: f.designation.trim(), phone: f.phone.trim(), skills });
      setUser({ ...user, ...data });
      toast.success("Profile saved");
    } catch (e) {
      toast.error(errMsg(e, "Unable to save profile"));
    } finally {
      setBusy(false);
    }
  };
  const photo = async () => {
    const file = await pickFile({ imagesOnly: true });
    if (!file) return;
    setPhotoBusy(true);
    try {
      const data = await uploadFile("/auth/avatar", file);
      setUser({ ...user, ...data });
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e.response?.status === 404 ? "Photo upload needs the latest server update" : errMsg(e, "Unable to upload photo"));
    } finally {
      setPhotoBusy(false);
    }
  };
  return (
    <Screen header={<BackHeader title="Personal Information" search />} keyboard>
      <Card style={pi.top}>
        <Pressable onPress={photo} disabled={photoBusy} accessibilityLabel="Change profile photo">
          <Avatar user={user} size={u(236)} border />
          <View style={pi.camera}>
            <Ionicons name={photoBusy ? "hourglass" : "camera"} size={u(26)} color={C.navy} />
          </View>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={pi.pill}>
            <Text style={pi.pillText} numberOfLines={1} adjustsFontSizeToFit>
              Personal Information
            </Text>
          </View>
          <Text style={pi.name}>{user.name}</Text>
          <Text style={pi.line}>{user.designation || roleLabel(user.role)}</Text>
          {!!user.employeeCode && <Text style={pi.line}>{user.employeeCode}</Text>}
        </View>
      </Card>
      <Card style={pi.form}>
        <Text style={pi.h2}>Personal Information</Text>
        <Field label="Employee ID">
          <TextField value={user.employeeCode || "Not assigned"} editable={false} style={{ backgroundColor: "#f7f8fa", color: "#555" }} />
        </Field>
        <Field label="Full Name">
          <TextField value={f.name} onChangeText={set("name")} />
        </Field>
        <Field label="Designation">
          <TextField value={f.designation} onChangeText={set("designation")} placeholder="e.g. Machine Operator" />
        </Field>
        <Field label="Phone">
          <TextField value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="10 digit mobile number" />
        </Field>
        <Field label="Skills" hint="Separate skills with commas">
          <TextField value={f.skills} onChangeText={set("skills")} placeholder="Photoshop, AutoCAD, ..." />
        </Field>
        <Btn title="Save changes" variant="navy" loading={busy} onPress={save} style={{ marginTop: u(36) }} />
      </Card>
    </Screen>
  );
}

const pi = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: u(50), paddingHorizontal: u(76), paddingVertical: u(18), borderRadius: u(14) },
  camera: { position: "absolute", right: u(4), bottom: u(18), width: u(46), height: u(46), borderRadius: 99, backgroundColor: "#34ccff", alignItems: "center", justifyContent: "center" },
  pill: { alignSelf: "flex-start", backgroundColor: "#d5d9e9", borderRadius: 999, paddingHorizontal: u(22), paddingVertical: u(4), maxWidth: "100%" },
  pillText: { fontFamily: F.m, fontSize: fs(30), color: C.navy },
  name: { fontFamily: F.s, fontSize: fs(36), color: "#000", marginTop: u(26) },
  line: { fontFamily: F.r, fontSize: fs(26), color: "#000", marginTop: u(12) },
  form: { marginTop: u(22), paddingHorizontal: u(18), paddingTop: u(30), paddingBottom: u(40), borderRadius: u(14) },
  h2: { fontFamily: F.s, fontSize: fs(36), color: "#000" },
});
