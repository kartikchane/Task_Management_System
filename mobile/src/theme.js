import { Dimensions, Platform } from "react-native";

// The designer's screens are 882 px wide (a 441 pt phone at 2x).
// u(n) turns a size measured in the design into points for this phone.
const { width } = Dimensions.get("window");
const W = Math.min(width, 520);
export const u = (n) => (n * W) / 882;
// The mockups were drawn with slightly tighter type than Poppins renders at the
// measured height, so text is scaled by 0.92. It never goes below 10 pt so it
// stays readable on small phones.
export const fs = (n) => Math.max(10, Math.round(u(n) * 9.2) / 10);

export const C = {
  navy: "#2f4392",
  navyDark: "#093693",
  blueText: "#0f44a2",
  primary: "#3b4aef",
  signIn: "#2c62ec",
  sky: "#1caff8",
  cyan: "#33c6fb",
  text: "#0b0c10",
  muted: "#555b6b",
  subtle: "#626d85",
  line: "#e9e9e9",
  fieldBg: "#f0f4fb",
  fieldLine: "#dae7ff",
  inputLine: "#e0e2e8",
  white: "#ffffff",
  red: "#e5141b",
  green: "#179760",
  orange: "#fb800c",
  purple: "#7419ee",
  blue: "#2d1df6",
  tabInactive: "#c9cbd1",
};

export const tones = {
  blue: { fg: "#2d1df6", bg: "#eef0fe" },
  green: { fg: "#179760", bg: "#e4f9f1" },
  orange: { fg: "#fb800c", bg: "#fdf3e3" },
  purple: { fg: "#7419ee", bg: "#f4ebfd" },
  red: { fg: "#e5141b", bg: "#fdecec" },
  navy: { fg: "#2f4392", bg: "#e8ecf8" },
};

export const F = {
  r: "Poppins_400Regular",
  m: "Poppins_500Medium",
  s: "Poppins_600SemiBold",
  b: "Poppins_700Bold",
};

// Light blue page gradient behind every app screen (sampled from the design)
export const pageGradient = {
  colors: ["#2f4392", "#2f4392", "#3e58a1", "#5479b8", "#6998ce", "#7ab0df", "#87c4ed", "#8fd0f5", "#93d4f7"],
  locations: [0, 0.17, 0.29, 0.41, 0.52, 0.64, 0.75, 0.84, 1],
};

export const shadow = Platform.select({
  web: { boxShadow: "0 6px 24px rgba(10,30,80,0.10)" },
  default: { shadowColor: "#0a1e50", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
});
