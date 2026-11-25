import { PasswordResetForm } from "@/components/auth/PasswordResetForm";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return <PasswordResetForm expired={expired === "1"} />;
}
