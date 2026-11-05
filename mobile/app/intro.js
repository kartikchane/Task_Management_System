import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import Svg, { Defs, Ellipse, LinearGradient as SvgGradient, Path, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IMAGES } from "../src/assets";
import { useAuth } from "../src/auth";
import { Icon } from "../src/components/ui";
import { C, F } from "../src/theme";

// Two intro pages from the design (Screen-1 and Screen-2). Shown only the first time.
export default function Intro() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { finishOnboarding, onboarded } = useAuth();
  const [seenBefore] = useState(onboarded); // e.g. after logout: go straight to sign in
  const [page, setPage] = useState(0);
  const pager = useRef(null);
  const k = width / 882; // design pixel -> points
  const done = async () => {
    await finishOnboarding();
    router.replace("/login");
  };
  const next = () => pager.current?.scrollTo({ x: width, animated: true });

  const Dots = ({ light }) => (
    <View style={{ flexDirection: "row", gap: 7 * k * 2, justifyContent: "center", alignItems: "center" }}>
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            height: 14 * k,
            width: i === page ? 52 * k : 14 * k,
            borderRadius: 99,
            backgroundColor: light ? (i === page ? "#fff" : "#d0d9f5") : i === page ? "#001771" : "#c8c8c8",
          }}
        />
      ))}
    </View>
  );

  if (seenBefore) return <Redirect href="/login" />;
  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={64}
      >
        {/* ---------- page 1: products ---------- */}
        <Pressable onPress={next} style={{ width, height }}>
          <Image source={IMAGES.introPhoto} style={{ position: "absolute", left: 0, width, height: 1020 * k, bottom: 244 * k }} contentFit="cover" />
          <Stage k={k} width={width} />
          <View style={{ paddingTop: insets.top + 90 * k, alignItems: "center" }}>
            <Image source={IMAGES.logo} style={{ width: 529 * k, height: 151 * k }} contentFit="contain" />
            <Text style={[st.headline, { fontSize: 92 * k, lineHeight: 86 * k, marginTop: 54 * k }]}>
              One Workspace{"\n"}For A Stronger{"\n"}Tomorrow.
            </Text>
            <Text style={[st.sub, { fontSize: 30 * k, lineHeight: 32 * k, marginTop: 22 * k }]}>
              Manage your teams, projects, approvals and{"\n"}operations - all in one secure platform.
            </Text>
          </View>
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 148 * k + insets.bottom * 0.3 }}>
            <Features k={k} />
            <View style={{ marginTop: 62 * k }}>
              <Dots light />
            </View>
          </View>
        </Pressable>

        {/* ---------- page 2: illustration + Get Started ---------- */}
        <View style={{ width, height }}>
          <Image source={IMAGES.introPhoto} style={{ position: "absolute", left: 0, width, height: 1020 * k, top: 600 * k, opacity: 0.2 }} contentFit="cover" />
          <View style={{ paddingTop: insets.top + 90 * k, alignItems: "center", paddingHorizontal: 30 * k }}>
            <Image source={IMAGES.logo} style={{ width: 529 * k, height: 151 * k }} contentFit="contain" />
            <Text style={[st.headline2, { fontSize: 60 * k, lineHeight: 87 * k, marginTop: 30 * k }]}>
              Manage work.{"\n"}Track progress.{"\n"}Get things done.
            </Text>
            <Text style={[st.sub, { fontSize: 32 * k, lineHeight: 62 * k, marginTop: 4 * k, fontFamily: F.m }]}>
              A smarter way to manage your{"\n"}tasks, projects and team{"\n"}activities.
            </Text>
          </View>
          <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: insets.bottom + 74 * k, alignItems: "center" }}>
            <Image source={IMAGES.onboarding} style={{ width: 683 * k, height: 627 * k, maxHeight: height * 0.36 }} contentFit="contain" />
            <View style={{ marginTop: 64 * k }}>
              <Dots />
            </View>
            <Pressable onPress={done} style={({ pressed }) => [st.start, { height: 112 * k, marginTop: 74 * k, width: 729 * k }, pressed && { opacity: 0.85 }]}>
              <Text style={[st.startText, { fontSize: 36 * k }]}>Get Started</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <Pressable onPress={done} hitSlop={10} style={[st.skip, { top: insets.top + 12 }]} accessibilityLabel="Skip intro">
        <Text style={st.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

// Podium, products and blue waves at the bottom of page 1
function Stage({ k, width }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, bottom: 0, width, height: 760 * k }}>
      <Svg width={width} height={760 * k} viewBox="0 0 882 760" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="back" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#3a7fdf" />
            <Stop offset="1" stopColor="#4a8cee" />
          </SvgGradient>
          <SvgGradient id="side" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3566c2" />
            <Stop offset="1" stopColor="#2e4fd6" stopOpacity="0" />
          </SvgGradient>
          <SvgGradient id="top" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8fb0e4" />
            <Stop offset="1" stopColor="#cddcf3" />
          </SvgGradient>
        </Defs>
        {/* y in this box = design y - 1104 */}
        <Path fill="url(#back)" d="M0 270 C 120 262 260 300 440 300 C 620 300 760 288 882 280 L 882 760 L 0 760 Z" />
        <Path fill="#2e4cdb" d="M0 360 C 200 380 420 420 600 450 C 720 470 820 490 882 500 L 882 760 L 0 760 Z" />
        <Path fill="#2c51d3" d="M300 760 C 500 690 700 690 882 700 L 882 760 Z" />
        <Path fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.6" d="M420 760 C 560 730 720 712 882 712" />
        <Rect x="45" y="411" width="776" height="125" fill="url(#side)" />
        <Ellipse cx="433" cy="411" rx="388" ry="46" fill="url(#top)" />
      </Svg>
      <Image
        source={IMAGES.products}
        style={{ position: "absolute", left: 65 * k, top: 21 * k, width: 752 * k, height: 400 * k }}
        contentFit="contain"
      />
    </View>
  );
}

function Features({ k }) {
  const items = [
    ["group", "Team", "Management"],
    ["new-project", "Project", "Tracking"],
    ["settings", "Operational", "Efficiency"],
    ["shield-copy", "Secure", "Access"],
  ];
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 32 * k }}>
      {items.map(([icon, a, b]) => (
        <View key={a} style={{ flexDirection: "row", alignItems: "center", gap: 13 * k }}>
          <View style={[st.featureIcon, { width: 64 * k, height: 64 * k, borderWidth: 2 * k }]}>
            <Icon name={icon} size={34 * k} color="#fff" />
          </View>
          <Text style={[st.featureText, { fontSize: Math.max(10, 21 * k), lineHeight: Math.max(12, 21 * k) }]}>
            {a}
            {"\n"}
            {b}
          </Text>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  headline: { fontFamily: F.b, color: "#34ccff", textAlign: "center" },
  headline2: { fontFamily: F.m, color: "#34ccff", textAlign: "center" },
  sub: { fontFamily: F.r, color: "#fff", textAlign: "center" },
  featureIcon: { borderRadius: 999, borderColor: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  featureText: { fontFamily: F.r, color: "#fff" },
  start: { backgroundColor: "#fff", borderRadius: 999, alignItems: "center", justifyContent: "center" },
  startText: { fontFamily: F.m, color: C.navy },
  skip: { position: "absolute", right: 16, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.14)" },
  skipText: { fontFamily: F.m, fontSize: 13, color: "#fff" },
});
