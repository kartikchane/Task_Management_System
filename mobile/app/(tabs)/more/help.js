import { Linking, StyleSheet, Text, View } from "react-native";
import { BackHeader, Screen } from "../../../src/components/layout";
import { Btn, Card } from "../../../src/components/ui";
import { F, fs, u } from "../../../src/theme";

// Optional: set EXPO_PUBLIC_SUPPORT_EMAIL in mobile/.env to show an "Email support" button.
const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "";

const FAQ = [
  ["How do I submit my daily work?", "Open Daily work, fill in what you completed, any blockers and tomorrow's plan, attach a photo or file as proof, then tap Submit daily update."],
  ["My manager asked for changes. What now?", "The task shows 'Changes requested' with your manager's note. Your earlier answers are filled in again, so just update them and submit again."],
  ["How do I apply for leave?", "More > My Leave. Choose the type, dates and reason, then tap Submit Request. You get a notification when it is approved or rejected."],
  ["I forgot my password.", "On the sign-in screen tap 'Forgot password?' and enter your email. If your account has no email, ask your admin to reset it."],
  ["The app says it can't reach the server.", "Check your internet. If it still fails, ask your admin for the correct workspace address and enter it under 'Enterprise workspace' on the sign-in screen."],
];

export default function Help() {
  return (
    <Screen header={<BackHeader title="Help & Support" />}>
      <Card style={hs.card}>
        {FAQ.map(([q, a], i) => (
          <View key={q} style={[hs.item, i > 0 && hs.line]}>
            <Text style={hs.q}>{q}</Text>
            <Text style={hs.a}>{a}</Text>
          </View>
        ))}
      </Card>
      <Card style={[hs.card, { marginTop: u(26), padding: u(30) }]}>
        <Text style={hs.q}>Still need help?</Text>
        <Text style={hs.a}>Contact your manager or the TaskFlow admin of Ganesh Gauri Industries.</Text>
        {!!SUPPORT && (
          <Btn title="Email support" variant="navy" small style={{ marginTop: u(22), alignSelf: "flex-start" }} onPress={() => Linking.openURL(`mailto:${SUPPORT}?subject=TaskFlow%20app%20help`)} />
        )}
      </Card>
    </Screen>
  );
}

const hs = StyleSheet.create({
  card: { borderRadius: u(14), overflow: "hidden" },
  item: { padding: u(30) },
  line: { borderTopWidth: 1, borderTopColor: "#e5e5e5" },
  q: { fontFamily: F.s, fontSize: fs(26), color: "#000" },
  a: { fontFamily: F.r, fontSize: fs(23), color: "#333", marginTop: u(8), lineHeight: u(36) },
});
