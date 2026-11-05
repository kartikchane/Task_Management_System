import { StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { IMAGES } from "../../../src/assets";
import { getApiBase } from "../../../src/api";
import { BackHeader, Screen } from "../../../src/components/layout";
import { Card } from "../../../src/components/ui";
import { C, F, fs, u } from "../../../src/theme";

export default function About() {
  return (
    <Screen header={<BackHeader title="About Us" />}>
      <Card style={as.card}>
        <View style={as.logoBox}>
          <Image source={IMAGES.logo} style={{ width: u(420), height: u(120) }} contentFit="contain" />
        </View>
        <Text style={as.h}>Ganesh Gauri Industries Pvt. Ltd.</Text>
        <Text style={as.p}>Makers of Gouri Aqua Plast tanks, pipes and fittings — Kamptee, Nagpur, Maharashtra.</Text>
        <Text style={as.p}>TaskFlow is our workspace for daily work updates, tasks, attendance, leave and approvals — one secure platform for the whole team.</Text>
        <View style={as.meta}>
          <Text style={as.small}>App version {Constants.expoConfig?.version || "1.0.0"}</Text>
          <Text style={as.small} numberOfLines={1}>
            Workspace: {getApiBase().replace(/^https?:\/\//, "").replace(/\/api$/, "")}
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const as = StyleSheet.create({
  card: { borderRadius: u(14), padding: u(34) },
  logoBox: { backgroundColor: C.navy, borderRadius: u(14), alignItems: "center", paddingVertical: u(30) },
  h: { fontFamily: F.s, fontSize: fs(30), color: "#000", marginTop: u(30) },
  p: { fontFamily: F.r, fontSize: fs(23), color: "#333", marginTop: u(14), lineHeight: u(36) },
  meta: { borderTopWidth: 1, borderTopColor: "#e5e5e5", marginTop: u(30), paddingTop: u(20), gap: 4 },
  small: { fontFamily: F.r, fontSize: fs(20), color: "#666" },
});
