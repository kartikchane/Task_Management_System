import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Login token goes to the phone's secure storage; other small settings to normal storage.
const secure = Platform.OS !== "web";

export const store = {
  get: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key, value) => {
    try {
      if (value === null || value === undefined) await AsyncStorage.removeItem(key);
      else await AsyncStorage.setItem(key, String(value));
    } catch {}
  },
  getJSON: async (key) => {
    try {
      return JSON.parse((await AsyncStorage.getItem(key)) || "null");
    } catch {
      return null;
    }
  },
  setJSON: (key, value) => store.set(key, value === null ? null : JSON.stringify(value)),
};

export const secureStore = {
  get: async (key) => {
    try {
      return secure ? await SecureStore.getItemAsync(key) : await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key, value) => {
    try {
      if (!secure) return value ? AsyncStorage.setItem(key, value) : AsyncStorage.removeItem(key);
      return value ? SecureStore.setItemAsync(key, value) : SecureStore.deleteItemAsync(key);
    } catch {}
  },
};
