import RegisterPage from "@/components/auth/RegisterPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your TeamSync account.",
};

export default function RegisterRoute() {
  return <RegisterPage />;
}
