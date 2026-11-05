import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import api, { getApiBase, getToken } from "./api";

// Save some text as a file and open the phone's share sheet (WhatsApp, Drive, email ...).
export async function shareText(name, text, mimeType) {
  if (Platform.OS === "web") return webDownload(new Blob([text], { type: mimeType }), name);
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(text);
  await Sharing.shareAsync(f.uri, { mimeType, dialogTitle: name });
}

// Download a file from the API (with the login token) and share it.
export async function shareDownload(path, params, name, mimeType) {
  if (Platform.OS === "web") {
    const r = await api.get(path, { params, responseType: "blob" });
    return webDownload(r.data, name);
  }
  const qs = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v)).toString();
  const dest = new File(Paths.cache, name);
  if (dest.exists) dest.delete();
  const file = await File.downloadFileAsync(`${getApiBase()}${path}${qs ? "?" + qs : ""}`, dest, {
    headers: { Authorization: `Bearer ${getToken()}` },
    idempotent: true,
  });
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

// Turn HTML into a PDF and share it.
export async function sharePdf(html, name) {
  if (Platform.OS === "web") {
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: name, UTI: "com.adobe.pdf" });
}

function webDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
