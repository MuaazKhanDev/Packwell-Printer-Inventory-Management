import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return <LoginForm passwordConfigured={Boolean(process.env.PACKWELL_PASSWORD)} />;
}
