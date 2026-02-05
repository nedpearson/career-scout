import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default async function SignUpPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const callbackUrl = typeof sp.callbackUrl === "string" ? sp.callbackUrl : "/";
  const error = typeof sp.error === "string" ? sp.error : "";

  async function createAccount(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const name = String(formData.get("name") ?? "").trim() || undefined;
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!email) redirect(`/signup?error=${encodeURIComponent("MissingEmail")}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    if (password.length < 8)
      redirect(`/signup?error=${encodeURIComponent("PasswordTooShort")}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    if (password !== confirmPassword)
      redirect(`/signup?error=${encodeURIComponent("PasswordMismatch")}&callbackUrl=${encodeURIComponent(callbackUrl)}`);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) redirect(`/signup?error=${encodeURIComponent("EmailInUse")}&callbackUrl=${encodeURIComponent(callbackUrl)}`);

    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password)
      }
    });

    // After signup, send user back to sign-in (no extra click).
    redirect(
      `/signin?created=1&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`
    );
  }

  const message =
    error === "EmailInUse"
      ? "An account with that email already exists."
      : error === "PasswordMismatch"
        ? "Passwords don’t match."
        : error === "PasswordTooShort"
          ? "Password must be at least 8 characters."
          : error
            ? `Signup error: ${error}`
            : "";

  return (
    <Card title="Create account" description="Your email will be your login.">
      {message ? (
        <div className="mt-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-500/20">
          {message}
        </div>
      ) : null}

      <form action={createAccount} className="mt-3 space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">Email</label>
          <Input name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">Name (optional)</label>
          <Input name="name" type="text" placeholder="Your name" autoComplete="name" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">Password</label>
          <Input name="password" type="password" placeholder="At least 8 characters" required autoComplete="new-password" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">Confirm password</label>
          <Input
            name="confirmPassword"
            type="password"
            placeholder="Re-type password"
            required
            autoComplete="new-password"
          />
        </div>

        <Button className="w-full" type="submit">
          Create account
        </Button>
      </form>

      <div className="mt-4 text-center text-sm text-white/70">
        Already have an account?{" "}
        <Link className="underline decoration-white/20 underline-offset-4" href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
          Sign in
        </Link>
      </div>
    </Card>
  );
}

