import LoginPage from "@/components/auth/LoginPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your TeamSync collaborative workspace.",
};

export default function LoginRoute() {
  return <LoginPage />;
}
