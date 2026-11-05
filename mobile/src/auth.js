import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { DEFAULT_API, setApiBase, setToken, setUnauthorizedHandler } from "./api";
import { secureStore, store } from "./storage";

const AuthContext = createContext(null);
const TOKEN = "tf_token";
const USER = "tf_user";
export const SERVER_KEY = "tf_server";
export const ONBOARDED = "tf_onboarded";
export const REMEMBER = "tf_remember_login";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(true);

  const clear = useCallback(async () => {
    setToken(null);
    setUser(null);
    await secureStore.set(TOKEN, null);
    await store.set(USER, null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => clear());
    (async () => {
      setApiBase((await store.get(SERVER_KEY)) || DEFAULT_API);
      setOnboarded(!!(await store.get(ONBOARDED)));
      const token = await secureStore.get(TOKEN);
      if (token) {
        setToken(token);
        setUser(await store.getJSON(USER)); // show the app straight away, then refresh from the server
        try {
          const { data } = await api.get("/auth/me");
          setUser(data);
          store.setJSON(USER, data);
        } catch (e) {
          if (e.response?.status === 401) await clear();
        }
      }
      setReady(true);
    })();
  }, [clear]);

  const saveSession = async (token, u) => {
    setToken(token);
    await secureStore.set(TOKEN, token);
    await store.setJSON(USER, u);
    setUser(u);
  };

  const value = useMemo(
    () => ({
      user,
      ready,
      onboarded,
      finishOnboarding: async () => {
        await store.set(ONBOARDED, "1");
        setOnboarded(true);
      },
      login: async (identifier, password) => {
        const { data } = await api.post("/auth/login", { identifier, password });
        await saveSession(data.token, data.user);
        return data.user;
      },
      register: async (payload) => {
        const { data } = await api.post("/auth/register", payload);
        await saveSession(data.token, data.user);
        return data.user;
      },
      refreshMe: async () => {
        const { data } = await api.get("/auth/me");
        setUser(data);
        store.setJSON(USER, data);
        return data;
      },
      setUser: (u) => {
        setUser(u);
        store.setJSON(USER, u);
      },
      logout: clear,
    }),
    [user, ready, onboarded, clear],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export const isManager = (user) => user && user.role !== "employee";
