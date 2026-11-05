import { Redirect } from "expo-router";
import { useAuth } from "../src/auth";

// First screen: intro the very first time, then login, or straight into the app when signed in.
export default function Index() {
  const { user, onboarded } = useAuth();
  if (user) return <Redirect href="/(tabs)" />;
  return <Redirect href={onboarded ? "/login" : "/intro"} />;
}
