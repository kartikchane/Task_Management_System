import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { F, fs, u } from "./theme";

const ToastContext = createContext(() => {});
let globalShow = () => {};
// toast("Saved") / toast.error("...") from anywhere
export const toast = (msg) => globalShow(msg, "info");
toast.success = (msg) => globalShow(msg, "success");
toast.error = (msg) => globalShow(msg, "error");

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const show = useCallback(
    (msg, kind) => {
      clearTimeout(timer.current);
      setItem({ msg: String(msg), kind });
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== "web" }).start();
      timer.current = setTimeout(
        () =>
          Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== "web" }).start(() =>
            setItem(null),
          ),
        kind === "error" ? 3800 : 2600,
      );
    },
    [anim],
  );
  globalShow = show;
  return (
    <ToastContext.Provider value={show}>
      {children}
      {item && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            { top: insets.top + 10, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] },
          ]}
        >
          <View style={[styles.toast, item.kind === "error" && styles.error, item.kind === "success" && styles.success]}>
            <Text style={styles.text}>{item.msg}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 999 },
  toast: { backgroundColor: "#1c2233", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, maxWidth: 480 },
  error: { backgroundColor: "#c11b1b" },
  success: { backgroundColor: "#0b7a4b" },
  text: { color: "#fff", fontFamily: F.m, fontSize: fs(25), lineHeight: u(36) > 15 ? u(36) : 18 },
});
