import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image as RNImage,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ICONS } from "../assets";
import { C, F, fs, shadow, tones, u } from "../theme";
import { label as niceLabel, localIso, longDate } from "../utils";

/* ---------- icons ---------- */

// Designer icon, tinted to any colour: <Icon name="calendar" size={20} color="#fff" />
export function Icon({ name, size = u(40), color = C.navy, style }) {
  const src = ICONS[name];
  if (!src) return null;
  return <RNImage source={src} style={[{ width: size, height: size, tintColor: color }, style]} resizeMode="contain" />;
}

/* ---------- basic blocks ---------- */

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;

export const Divider = ({ style }) => <View style={[s.divider, style]} />;

export const Loading = ({ style, color = C.navy }) => (
  <View style={[{ paddingVertical: u(60), alignItems: "center" }, style]}>
    <ActivityIndicator size="large" color={color} />
  </View>
);

const btnStyles = {
  primary: { bg: C.primary, fg: "#fff", border: C.primary },
  navy: { bg: C.navy, fg: "#fff", border: C.navy },
  signin: { bg: C.signIn, fg: "#fff", border: C.signIn },
  sky: { bg: C.sky, fg: "#fff", border: "#7fd2ff" },
  outline: { bg: "#fff", fg: C.blueText, border: C.fieldLine },
  outlineNavy: { bg: "#fff", fg: C.navy, border: C.navy },
  outlineDark: { bg: "#fff", fg: "#000", border: "#c9c9c9" },
  soft: { bg: "#e0eafd", fg: "#1a3a9a", border: "#e0eafd" },
  black: { bg: "#000", fg: "#fff", border: "#000" },
  danger: { bg: "#fff", fg: C.red, border: "#f3c4c4" },
  green: { bg: "#0b7a4b", fg: "#fff", border: "#0b7a4b" },
  orange: { bg: "#fff3e3", fg: "#a86100", border: "#ffe1b7" },
};

// Button. icon = designer icon name (string) or any element.
export function Btn({ title, onPress, variant = "primary", icon, iconRight, disabled, loading, style, textStyle, small, pill }) {
  const v = btnStyles[variant] || btnStyles.primary;
  const ic = (x) =>
    typeof x === "string" ? <Icon name={x} size={small ? u(30) : u(36)} color={v.fg} /> : x;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        pill && { borderRadius: 999 },
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.8 },
        style,
      ]}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon ? ic(icon) : null}
      {!!title && <Text style={[s.btnText, small && s.btnTextSmall, { color: v.fg }, textStyle]}>{title}</Text>}
      {iconRight ? ic(iconRight) : null}
    </Pressable>
  );
}

const pillColors = {
  green: ["#e3f7ee", "#0b7a4b"],
  orange: ["#fff0dd", "#b25f00"],
  red: ["#fde8e8", "#c11b1b"],
  purple: ["#ede6ff", "#6b3fd6"],
  blue: ["#e3ecff", "#1f4fc9"],
  muted: ["#ececec", "#3b3f4a"],
};
export function Pill({ text, tone = "muted", style, textStyle }) {
  const [bg, fg] = pillColors[tone] || pillColors.muted;
  return (
    <View style={[s.pill, { backgroundColor: bg }, style]}>
      <Text style={[s.pillText, { color: fg }, textStyle]} numberOfLines={1}>
        {niceLabel(text)}
      </Text>
    </View>
  );
}

/* ---------- headings ---------- */

export const DateChip = ({ style }) => (
  <View style={[s.dateChip, style]}>
    <Icon name="calendar" size={u(24)} color={C.blueText} />
    <Text style={s.dateChipText} numberOfLines={1} adjustsFontSizeToFit>
      {longDate()}
    </Text>
  </View>
);

export const SectionHead = ({ title, subtitle, right, style, big }) => (
  <View style={[s.sectionHead, style]}>
    <View style={{ flex: 1 }}>
      <Text style={[s.sectionTitle, big && { fontFamily: F.s, fontSize: fs(30) }]}>{title}</Text>
      {!!subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
    </View>
    {right}
  </View>
);

/* ---------- stat card ---------- */

export function StatCard({ label, value, sub = "Live data", icon, tone = "blue", ghost, onPress, style, compact }) {
  const t = tones[tone] || tones.blue;
  const body = (
    <>
      {!!ghost && <Icon name={ghost} size={u(100)} color={t.fg} style={s.statGhost} />}
      <View style={[s.statBar, { backgroundColor: t.fg }]} />
      <View style={[s.statTile, compact && s.statTileCompact, { backgroundColor: t.bg }]}>
        {typeof icon === "string" ? <Icon name={icon} size={compact ? u(40) : u(50)} color={t.fg} /> : icon}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.statLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[s.statValue, compact && { fontSize: fs(40), lineHeight: u(52) }]}>{value}</Text>
        <Text style={s.statSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [s.stat, compact && s.statCompact, pressed && { opacity: 0.85 }, style]}>
      {body}
    </Pressable>
  ) : (
    <View style={[s.stat, compact && s.statCompact, style]}>{body}</View>
  );
}

/* ---------- empty state ---------- */

export function Empty({ image, title, text, style, imageStyle, dashed = true, icon }) {
  return (
    <View style={[s.empty, dashed && s.emptyDashed, style]}>
      {image ? (
        <Image source={image} style={[{ width: u(500), height: u(370) }, imageStyle]} contentFit="contain" />
      ) : (
        <Text style={{ fontSize: fs(40), color: "#4f6bc4" }}>{icon || "◆"}</Text>
      )}
      <Text style={s.emptyTitle}>{title}</Text>
      {!!text && <Text style={s.emptyText}>{text}</Text>}
    </View>
  );
}

/* ---------- form fields ---------- */

export const Field = ({ label, children, style, hint }) => (
  <View style={[{ marginTop: u(26) }, style]}>
    {!!label && <Text style={s.fieldLabel}>{label}</Text>}
    {children}
    {!!hint && <Text style={s.hint}>{hint}</Text>}
  </View>
);

export function TextField({ style, multiline, minHeight, ...p }) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor="#9a9ca3"
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={[s.input, multiline && { minHeight: minHeight || u(110), paddingTop: u(14) }, focus && s.inputFocus, style]}
      {...p}
    />
  );
}

// Dropdown that opens a list at the bottom of the screen. options: [{ value, label }] or strings.
export function Select({ value, options, onChange, placeholder = "Select", title, style, textStyle, multiple, disabled, compact }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const opts = (options || []).map((o) => (typeof o === "object" ? o : { value: o, label: niceLabel(o) }));
  const selected = multiple ? opts.filter((o) => (value || []).includes(o.value)) : opts.find((o) => o.value === value);
  const shown = multiple
    ? selected.length
      ? selected.map((o) => o.label).join(", ")
      : placeholder
    : selected
      ? selected.label
      : placeholder;
  const pick = (o) => {
    if (multiple) {
      const set = new Set(value || []);
      set.has(o.value) ? set.delete(o.value) : set.add(o.value);
      onChange(opts.filter((x) => set.has(x.value)).map((x) => x.value));
    } else {
      onChange(o.value);
      setOpen(false);
    }
  };
  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[s.input, s.select, compact && s.selectCompact, disabled && { opacity: 0.6 }, style]}
        accessibilityRole="button"
      >
        <Text
          style={[s.selectText, compact && { fontSize: fs(22) }, !selected || (multiple && !selected.length) ? { color: "#7c8295" } : null, textStyle]}
          numberOfLines={1}
        >
          {shown}
        </Text>
        <Ionicons name="chevron-down" size={u(30)} color="#111" />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.sheetBackdrop} onPress={() => setOpen(false)} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>{title || placeholder}</Text>
            {multiple && <Btn title="Done" small onPress={() => setOpen(false)} />}
          </View>
          <FlatList
            data={opts}
            keyExtractor={(o) => String(o.value)}
            style={{ maxHeight: 440 }}
            renderItem={({ item }) => {
              const on = multiple ? (value || []).includes(item.value) : item.value === value;
              return (
                <Pressable onPress={() => pick(item)} style={({ pressed }) => [s.sheetRow, pressed && { backgroundColor: "#f0f4fb" }]}>
                  <Text style={[s.sheetRowText, on && { fontFamily: F.s, color: C.navy }]}>{item.label}</Text>
                  {on && <Ionicons name={multiple ? "checkbox" : "checkmark"} size={20} color={C.navy} />}
                  {!on && multiple && <Ionicons name="square-outline" size={20} color="#9aa0ae" />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

// Date picker field. value / onChange use "YYYY-MM-DD".
export function DateField({ value, onChange, placeholder = "dd/mm/yyyy", style, compact, min }) {
  const [open, setOpen] = useState(false);
  const shown = value ? value.split("-").reverse().join("/") : placeholder;
  if (Platform.OS === "web") {
    return (
      <View style={[s.input, s.select, compact && s.selectCompact, style]}>
        <input
          type="date"
          value={value || ""}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          style={{ border: 0, outline: 0, flex: 1, fontFamily: F.r, fontSize: compact ? 12 : 14, background: "transparent", minWidth: 0 }}
        />
      </View>
    );
  }
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[s.input, s.select, compact && s.selectCompact, style]}>
        <Text style={[s.selectText, compact && { fontSize: fs(22) }, !value && { color: "#7c8295" }]} numberOfLines={1}>
          {shown}
        </Text>
        <Icon name="calendar" size={u(28)} color="#222" />
      </Pressable>
      {open && (
        <DateTimePicker
          value={value ? new Date(value + "T12:00:00") : new Date()}
          mode="date"
          minimumDate={min ? new Date(min + "T00:00:00") : undefined}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === "set" && d) onChange(localIso(d));
          }}
        />
      )}
    </>
  );
}

// Checkbox with text
export function Check({ checked, onChange, children, style, round }) {
  return (
    <Pressable onPress={() => onChange(!checked)} style={[{ flexDirection: "row", alignItems: "center", gap: u(20) }, style]} hitSlop={6}>
      <View style={[s.check, round && { borderRadius: 99 }, checked && s.checkOn]}>
        {checked && <Ionicons name="checkmark" size={u(30)} color="#fff" />}
      </View>
      {typeof children === "string" ? <Text style={s.checkText}>{children}</Text> : children}
    </Pressable>
  );
}

// Simple centred dialog
export function Dialog({ visible, onClose, title, children, wide }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[s.dialogWrap, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[s.dialog, wide && { maxWidth: 560 }]}>
          <View style={s.dialogHead}>
            <Text style={s.dialogTitle} numberOfLines={2}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color="#333" />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingTop: 6 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export const ProgressBar = ({ value = 0, style, color = "#0886e1", track = "#ebebfe", height = u(14) }) => (
  <View style={[{ height, borderRadius: 99, backgroundColor: track, overflow: "hidden" }, style]}>
    <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", backgroundColor: color, borderRadius: 99 }} />
  </View>
);

export const s = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: u(22), ...shadow },
  divider: { height: 1, backgroundColor: C.line },
  btn: {
    minHeight: u(84),
    paddingHorizontal: u(26),
    borderRadius: u(12),
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: u(14),
  },
  btnSmall: { minHeight: u(64), paddingHorizontal: u(20), gap: u(10) },
  btnText: { fontFamily: F.m, fontSize: fs(27) },
  btnTextSmall: { fontSize: fs(23) },
  pill: { paddingHorizontal: u(22), paddingVertical: u(6), borderRadius: 999, alignSelf: "flex-start" },
  pillText: { fontFamily: F.m, fontSize: fs(20) },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: u(14),
    backgroundColor: "#fff",
    borderRadius: u(14),
    paddingHorizontal: u(18),
    height: u(60),
    ...shadow,
  },
  dateChipText: { fontFamily: F.s, fontSize: fs(21), color: C.blueText, flexShrink: 1 },
  sectionHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  sectionTitle: { fontFamily: F.m, fontSize: fs(30), color: "#000" },
  sectionSub: { fontFamily: F.r, fontSize: fs(21), color: "#111", marginTop: u(2) },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: u(22),
    backgroundColor: "#fff",
    borderRadius: u(16),
    paddingLeft: u(48),
    paddingRight: u(16),
    minHeight: u(168),
    overflow: "hidden",
    ...shadow,
  },
  statCompact: { minHeight: u(104), paddingLeft: u(44), gap: u(18) },
  statBar: { position: "absolute", left: u(22), top: "15%", bottom: "15%", width: u(5), borderRadius: 4 },
  statTile: { width: u(88), height: u(88), borderRadius: u(14), alignItems: "center", justifyContent: "center" },
  statTileCompact: { width: u(64), height: u(64) },
  statGhost: { position: "absolute", right: u(16), opacity: 0.12 },
  statLabel: { fontFamily: F.r, fontSize: fs(21), color: "#111" },
  statValue: { fontFamily: F.b, fontSize: fs(48), color: "#000", lineHeight: u(62) },
  statSub: { fontFamily: F.r, fontSize: fs(21), color: "#111" },
  empty: { alignItems: "center", paddingVertical: u(30), paddingHorizontal: u(20), borderRadius: u(14), backgroundColor: "#fff" },
  emptyDashed: { borderWidth: 1, borderStyle: "dashed", borderColor: "#666" },
  emptyTitle: { fontFamily: F.s, fontSize: fs(30), color: "#000", marginTop: u(14), textAlign: "center" },
  emptyText: { fontFamily: F.r, fontSize: fs(21), color: "#444", marginTop: u(8), textAlign: "center" },
  fieldLabel: { fontFamily: F.s, fontSize: fs(23), color: "#000", marginBottom: u(12) },
  hint: { fontFamily: F.r, fontSize: fs(18), color: "#8a8d96", marginTop: u(10), lineHeight: u(28) },
  input: {
    minHeight: u(72),
    borderWidth: 1,
    borderColor: "#e0e0e8",
    borderRadius: u(10),
    backgroundColor: "#fff",
    paddingHorizontal: u(24),
    fontFamily: F.r,
    fontSize: fs(23),
    color: "#111",
  },
  inputFocus: { borderColor: "#7f9df5" },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  selectCompact: { minHeight: u(60), paddingHorizontal: u(14) },
  selectText: { fontFamily: F.r, fontSize: fs(23), color: "#111", flex: 1 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(10,20,50,0.45)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 8 },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 4, backgroundColor: "#d5d9e2", marginTop: 8 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12 },
  sheetTitle: { fontFamily: F.s, fontSize: 16, color: "#111" },
  sheetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13, borderRadius: 10 },
  sheetRowText: { fontFamily: F.r, fontSize: 15, color: "#111", flex: 1 },
  check: { width: u(40), height: u(40), borderRadius: u(8), borderWidth: 2, borderColor: "#484deb", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: "#484deb" },
  checkText: { fontFamily: F.r, fontSize: fs(25), color: "#000", flexShrink: 1 },
  dialogWrap: { flex: 1, backgroundColor: "rgba(10,20,50,0.5)", justifyContent: "center", paddingHorizontal: 14 },
  dialog: { backgroundColor: "#fff", borderRadius: 16, maxHeight: "100%", width: "100%", alignSelf: "center", maxWidth: 480, overflow: "hidden" },
  dialogHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 18, paddingBottom: 10 },
  dialogTitle: { flex: 1, fontFamily: F.s, fontSize: 17, color: "#111" },
});
