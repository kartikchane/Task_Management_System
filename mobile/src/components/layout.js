import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IMAGES } from "../assets";
import api, { escapeRegex, fileUrl } from "../api";
import { isManager, useAuth } from "../auth";
import { C, F, fs, pageGradient, shadow, u } from "../theme";
import { confirm, initials, label, roleLabel } from "../utils";
import { DateChip, Icon } from "./ui";

/* ---------- pages (used by the side menu and the search) ---------- */
export const PAGES = [
  { to: "/", label: "Dashboard", icon: "dashboards" },
  { to: "/projects", label: "Projects", icon: "open-folder" },
  { to: "/daily-work", label: "Daily Work", icon: "appointment" },
  { to: "/attendance", label: "Attendance", icon: "time" },
  { to: "/more/leave", label: "Leave", icon: "airplane" },
  { to: "/more/calendar", label: "Calendar", icon: "calendar" },
  { to: "/more/tasks", label: "Additional Tasks", icon: "clipboard-check" },
  { to: "/more/notifications", label: "Notifications", icon: "bell" },
  { to: "/more/reports", label: "Reports", icon: "bar-chart", manager: true },
  { to: "/more/templates", label: "Daily Templates", icon: "template", manager: true },
  { to: "/more/profile", label: "My Profile", icon: "user" },
  { to: "/more/help", label: "Help & Support", icon: "help" },
  { to: "/more/about", label: "About Us", icon: "bcv-vc" },
];
export const usePages = () => {
  const { user } = useAuth();
  return useMemo(() => PAGES.filter((p) => !p.manager || isManager(user)), [user]);
};

/* ---------- shell: side menu, search, unread count ---------- */
const ShellContext = createContext(null);
export const useShell = () => useContext(ShellContext);

export function ShellProvider({ children }) {
  const { user } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [unread, setUnread] = useState(0);
  const refreshUnread = useCallback(() => {
    if (!user) return;
    api
      .get("/notifications")
      .then(({ data }) => setUnread(data.filter((x) => !x.read).length))
      .catch(() => {});
  }, [user]);
  useEffect(() => {
    refreshUnread();
    const t = setInterval(refreshUnread, 60000);
    return () => clearInterval(t);
  }, [refreshUnread]);
  const value = useMemo(
    () => ({ openDrawer: () => setDrawer(true), openSearch: () => setSearch(true), unread, refreshUnread }),
    [unread, refreshUnread],
  );
  return (
    <ShellContext.Provider value={value}>
      {children}
      {user && <SideMenu visible={drawer} onClose={() => setDrawer(false)} />}
      {user && <SearchOverlay visible={search} onClose={() => setSearch(false)} />}
    </ShellContext.Provider>
  );
}

/* ---------- page background ---------- */
// Light-blue gradient, factory photo at the top and the factory drawing at the bottom.
export function PageBackground({ bottom = true }) {
  const { width } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={pageGradient.colors} locations={pageGradient.locations} style={StyleSheet.absoluteFill} />
      <Image source={IMAGES.headerPhoto} style={{ position: "absolute", top: 0, left: 0, width, height: (width * 480) / 882 }} contentFit="cover" />
      {bottom && (
        <Image
          source={IMAGES.bottom}
          style={{ position: "absolute", bottom: 0, left: 0, width, height: (width * 202) / 916 }}
          contentFit="cover"
          contentPosition="bottom"
        />
      )}
    </View>
  );
}

/* ---------- screen wrapper ---------- */
export function Screen({ header, children, onRefresh, scroll = true, contentStyle, bottomImage = true, keyboard }) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[{ paddingHorizontal: u(40), paddingBottom: u(60) }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" colors={[C.navy]} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: u(40) }, contentStyle]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <PageBackground bottom={bottomImage} />
      <View style={{ height: insets.top }} />
      {header}
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

/* ---------- avatar ---------- */
export function Avatar({ user, size = u(61), style, border }) {
  const uri = fileUrl(user?.avatar);
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
        border && { borderWidth: u(4), borderColor: C.navy },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      ) : (
        <Text style={{ fontFamily: F.m, fontSize: size * 0.42, color: C.blueText }}>{initials(user?.name)}</Text>
      )}
    </View>
  );
}

/* ---------- headers ---------- */
const Burger = ({ onPress }) => (
  <Pressable onPress={onPress} hitSlop={10} accessibilityLabel="Open menu" style={{ width: u(44), gap: u(9), paddingVertical: u(6) }}>
    {[0, 1, 2].map((i) => (
      <View key={i} style={{ height: u(5.5), borderRadius: 3, backgroundColor: "#fff" }} />
    ))}
  </Pressable>
);

// Header on the main tab screens: menu, logo, search, notifications, profile
export function TopBar() {
  const router = useRouter();
  const { user } = useAuth();
  const shell = useShell();
  useFocusEffect(
    useCallback(() => {
      shell?.refreshUnread();
    }, [shell?.refreshUnread]),
  );
  return (
    <View style={hs.bar}>
      <Burger onPress={shell?.openDrawer} />
      <Image source={IMAGES.logo} style={hs.logo} contentFit="contain" />
      <View style={{ flex: 1 }} />
      <Pressable onPress={shell?.openSearch} hitSlop={8} accessibilityLabel="Search">
        <Icon name="magnifying-glass" size={u(58)} color="#fff" />
      </Pressable>
      <Pressable onPress={() => router.push("/more/notifications")} hitSlop={8} accessibilityLabel="Notifications" style={{ marginLeft: u(34) }}>
        <Icon name="bell" size={u(56)} color="#fff" />
        {shell?.unread > 0 && (
          <View style={hs.badge}>
            <Text style={hs.badgeText}>{shell.unread > 9 ? "9+" : shell.unread}</Text>
          </View>
        )}
      </Pressable>
      <Pressable onPress={() => router.push("/more/profile")} accessibilityLabel="My profile" style={{ marginLeft: u(34) }}>
        <Avatar user={user} />
      </Pressable>
    </View>
  );
}

// Header for "More" style screens: menu + title + optional right text button
export function MenuHeader({ title, right }) {
  const shell = useShell();
  return (
    <View style={[hs.bar, { paddingBottom: u(36) }]}>
      <Burger onPress={shell?.openDrawer} />
      <Text style={[hs.backTitle, { marginLeft: u(46) }]}>{title}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

// Header with a back arrow. Long titles (e.g. "Leave Management") wrap to two lines like the design.
export function BackHeader({ title, subtitle, right, onBack, search, bold }) {
  const router = useRouter();
  const shell = useShell();
  const back = onBack || (() => (router.canGoBack() ? router.back() : router.replace("/more")));
  return (
    <View style={[hs.backBar, !subtitle && !bold && { alignItems: "center", paddingBottom: u(36) }]}>
      <Pressable onPress={back} hitSlop={12} accessibilityLabel="Back" style={{ paddingTop: subtitle || bold ? u(18) : 0 }}>
        <Ionicons name="arrow-back" size={u(60)} color="#fff" />
      </Pressable>
      <View style={{ flex: 1, marginLeft: u(20), minWidth: 0 }}>
        <Text style={bold || subtitle ? hs.pageTitle : hs.backTitle}>{title}</Text>
        {!!subtitle && <Text style={hs.pageSub}>{subtitle}</Text>}
      </View>
      {right}
      {search && (
        <Pressable onPress={shell?.openSearch} hitSlop={8} accessibilityLabel="Search">
          <Icon name="magnifying-glass" size={u(58)} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

// Big white title under the top bar, with the date chip on the right
export function PageTitle({ title, subtitle, right, date = true }) {
  return (
    <View style={hs.titleRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={hs.pageTitle}>{title}</Text>
        {!!subtitle && <Text style={hs.pageSub}>{subtitle}</Text>}
      </View>
      {right || (date ? <DateChip style={{ marginTop: u(18), maxWidth: "52%" }} /> : null)}
    </View>
  );
}

/* ---------- side menu ---------- */
function SideMenu({ visible, onClose }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const pages = usePages();
  const x = useRef(new Animated.Value(-320)).current;
  useEffect(() => {
    if (visible) Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== "web" }).start();
  }, [visible, x]);
  const close = (after) => {
    Animated.timing(x, { toValue: -320, duration: 160, useNativeDriver: Platform.OS !== "web" }).start(() => {
      onClose();
      after?.();
    });
  };
  const go = (to) => close(() => router.navigate(to));
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()}>
      <Pressable style={hs.drawerBackdrop} onPress={() => close()} />
      <Animated.View style={[hs.drawer, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 14, transform: [{ translateX: x }] }]}>
        <Image source={IMAGES.logo} style={{ width: 190, height: 54, marginLeft: 14 }} contentFit="contain" />
        <Text style={hs.drawerCompany}>Ganesh Gauri{"\n"}Industries</Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 4 }}>
          {pages.map((p) => (
            <Pressable key={p.to} onPress={() => go(p.to)} style={({ pressed }) => [hs.drawerItem, pressed && { backgroundColor: "rgba(255,255,255,0.12)" }]}>
              <Icon name={p.icon} size={21} color="#fff" />
              <Text style={hs.drawerText}>{p.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={hs.drawerUser}>
          <Avatar user={user} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={hs.drawerName} numberOfLines={1}>
              {user?.name}
            </Text>
            <Text style={hs.drawerRole}>{roleLabel(user?.role)}</Text>
          </View>
        </View>
        <Pressable
          style={hs.drawerLogout}
          onPress={async () => {
            if (await confirm("Logout", "Do you want to log out of TaskFlow?", "Logout", true)) close(logout);
          }}
        >
          <Icon name="logout" size={20} color="#fff" />
          <Text style={hs.drawerText}>Logout</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

/* ---------- search ---------- */
const has = (t, q) =>
  String(t || "")
    .toLowerCase()
    .includes(q);

function SearchOverlay({ visible, onClose }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const pages = usePages();
  const [q, setQ] = useState("");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const cache = useRef({});
  const term = q.trim().toLowerCase();
  const manager = isManager(user);
  useEffect(() => {
    if (!visible) {
      setQ("");
      cache.current = {};
    }
  }, [visible]);
  useEffect(() => {
    if (term.length < 2) return setData({});
    let stop = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const once = (k, url) => (cache.current[k] ||= api.get(url).then((r) => r.data));
      const safe = (p) => p.catch(() => []);
      const [tasks, projects, daily, people] = await Promise.all([
        safe(api.get("/tasks", { params: { search: escapeRegex(term), limit: 5 } }).then((r) => r.data.items)),
        safe(once("projects", "/projects")),
        safe(user.role === "superadmin" ? Promise.resolve([]) : once("daily", "/daily-work/today")),
        safe(manager ? api.get("/users", { params: { search: escapeRegex(term) } }).then((r) => r.data) : Promise.resolve([])),
      ]);
      if (stop) return;
      const dailyTasks = Array.isArray(daily) ? [] : [...(daily.overdueTasks || []), ...(daily.assignedTasks || [])];
      setData({
        tasks,
        projects: projects.filter((x) => has(x.name, term) || has(x.code, term)),
        daily: dailyTasks.filter((x) => has(x.title, term)),
        people,
      });
      setLoading(false);
    }, 250);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [term, manager, user?.role]);
  const groups = [
    ["Pages", "dashboards", pages.filter((p) => has(p.label, term)).map((p) => ({ k: p.to, t: p.label, m: "Open page", to: p.to }))],
    ["Additional Tasks", "clipboard-check", (data.tasks || []).map((x) => ({ k: x._id, t: x.title, m: label(x.status), to: `/more/tasks?search=${encodeURIComponent(x.title)}` }))],
    ["Daily Work", "appointment", (data.daily || []).map((x) => ({ k: x._id, t: x.title, m: x.dueTime ? "Due " + x.dueTime : "Daily work", to: "/daily-work" }))],
    ["Projects", "open-folder", (data.projects || []).map((x) => ({ k: x._id, t: x.name, m: [x.code, x.status].filter(Boolean).join(" · "), to: `/projects?search=${encodeURIComponent(x.name)}` }))],
    ["People", "user", (data.people || []).map((x) => ({ k: x._id, t: x.name, m: x.designation || roleLabel(x.role), to: null }))],
  ]
    .map(([n, i, items]) => [n, i, items.slice(0, 5)])
    .filter((g) => term.length >= 2 && g[2].length);
  const go = (to) => {
    onClose();
    if (to) setTimeout(() => router.navigate(to), 50);
  };
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#f4f7fc", paddingTop: insets.top }}>
        <View style={hs.searchBar}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close search">
            <Ionicons name="arrow-back" size={24} color={C.navy} />
          </Pressable>
          <View style={hs.searchBox}>
            <Icon name="magnifying-glass" size={18} color="#555" />
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              placeholder="Search workspace..."
              placeholderTextColor="#7c8295"
              style={hs.searchInput}
              returnKeyType="search"
            />
            {!!q && (
              <Pressable onPress={() => setQ("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#9aa0ae" />
              </Pressable>
            )}
          </View>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14 }}>
          {term.length < 2 ? (
            <Text style={hs.searchNote}>Type at least 2 letters to search pages, tasks, daily work and projects.</Text>
          ) : groups.length ? (
            groups.map(([name, icon, items]) => (
              <View key={name} style={{ marginBottom: 12 }}>
                <Text style={hs.searchGroup}>{name.toUpperCase()}</Text>
                {items.map((it) => (
                  <Pressable key={it.k} onPress={() => go(it.to)} style={({ pressed }) => [hs.searchItem, pressed && { backgroundColor: "#e8eefc" }]}>
                    <View style={hs.searchIcon}>
                      <Icon name={icon} size={17} color={C.navy} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={hs.searchTitle} numberOfLines={1}>
                        {it.t}
                      </Text>
                      {!!it.m && (
                        <Text style={hs.searchMeta} numberOfLines={1}>
                          {it.m}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            ))
          ) : (
            <Text style={hs.searchNote}>{loading ? "Searching..." : `No results for "${q.trim()}".`}</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const hs = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: u(40), paddingTop: u(14), paddingBottom: u(26), minHeight: u(110) },
  logo: { width: u(310), height: u(86), marginLeft: u(46) },
  badge: {
    position: "absolute",
    right: -u(6),
    top: -u(8),
    minWidth: u(30),
    height: u(30),
    borderRadius: u(15),
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontFamily: F.s, fontSize: 10 },
  backBar: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: u(40), paddingTop: u(14), paddingBottom: u(24), gap: u(12) },
  backTitle: { fontFamily: F.m, fontSize: fs(38), color: "#fff" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: u(20), marginTop: u(16), marginBottom: u(36) },
  pageTitle: { fontFamily: F.b, fontSize: fs(38), lineHeight: u(52), color: "#fff" },
  pageSub: { fontFamily: F.r, fontSize: fs(21), lineHeight: u(28), color: "#fff", marginTop: u(8) },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,20,50,0.5)" },
  drawer: { position: "absolute", top: 0, bottom: 0, left: 0, width: 290, backgroundColor: C.navyDark, paddingHorizontal: 12 },
  drawerCompany: { fontFamily: F.m, fontSize: 16, color: "#fff", marginTop: 20, marginBottom: 10, marginLeft: 16, lineHeight: 21 },
  drawerItem: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  drawerText: { fontFamily: F.m, fontSize: 15, color: "#fff" },
  drawerUser: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 2, borderTopColor: "#5373b4", paddingTop: 14, marginTop: 6, paddingHorizontal: 6 },
  drawerName: { fontFamily: F.m, fontSize: 15, color: "#fff" },
  drawerRole: { fontFamily: F.r, fontSize: 13, color: "#fff" },
  drawerLogout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: "#2a5ccf",
    backgroundColor: "#0b41a7",
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 14,
  },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#d6e3fa",
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: { flex: 1, fontFamily: F.r, fontSize: 15, color: "#111", minWidth: 0, outlineStyle: "none" },
  searchNote: { fontFamily: F.r, fontSize: 14, color: "#555b6b", padding: 6 },
  searchGroup: { fontFamily: F.s, fontSize: 11.5, color: "#6b7387", letterSpacing: 0.6, marginBottom: 4, marginLeft: 4 },
  searchItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, backgroundColor: "#fff", marginBottom: 6, ...shadow },
  searchIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: "#e8ecf8", alignItems: "center", justifyContent: "center" },
  searchTitle: { fontFamily: F.m, fontSize: 14, color: "#0b0c10" },
  searchMeta: { fontFamily: F.r, fontSize: 12, color: "#6b7387" },
});
