import { Alert, Linking, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { getApiBase, getToken } from "./api";
import { toast } from "./toast";

// Ask the user for a photo (camera / gallery) or any document. Resolves to a file or null.
export function pickFile({ imagesOnly = false } = {}) {
  return new Promise((resolve) => {
    const fromCamera = async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return resolve(null), toast.error("Camera permission is needed");
      const r = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      resolve(r.canceled ? null : asset(r.assets[0], "photo.jpg"));
    };
    const fromGallery = async () => {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
      resolve(r.canceled ? null : asset(r.assets[0], "photo.jpg"));
    };
    const fromFiles = async () => {
      const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      resolve(r.canceled ? null : asset(r.assets[0], "document"));
    };
    if (Platform.OS === "web") return imagesOnly ? fromGallery() : fromFiles();
    const buttons = [
      { text: "Take photo", onPress: fromCamera },
      { text: "Choose photo", onPress: fromGallery },
    ];
    if (!imagesOnly) buttons.push({ text: "Choose file", onPress: fromFiles });
    buttons.push({ text: "Cancel", style: "cancel", onPress: () => resolve(null) });
    Alert.alert(imagesOnly ? "Profile photo" : "Attach proof", undefined, buttons, { cancelable: true, onDismiss: () => resolve(null) });
  });
}

const asset = (a, fallbackName) => ({
  uri: a.uri,
  name: a.fileName || a.name || fallbackName,
  type: a.mimeType || (a.uri?.match(/\.(png)$/i) ? "image/png" : a.uri?.match(/\.(jpe?g)$/i) ? "image/jpeg" : "application/octet-stream"),
  webFile: a.file, // only in the web preview
});

// Upload one file as multipart "file" to an API path. fetch is used because it handles phone file URIs reliably.
export async function uploadFile(path, file) {
  const fd = new FormData();
  if (Platform.OS === "web" && file.webFile) fd.append("file", file.webFile, file.name);
  else fd.append("file", { uri: file.uri, name: file.name, type: file.type });
  const res = await fetch(getApiBase() + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Upload failed");
    err.response = { data, status: res.status };
    throw err;
  }
  return data;
}

export const openUrl = (url) => Linking.openURL(url).catch(() => toast.error("Can't open this file"));
