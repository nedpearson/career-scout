import { signIn } from "@/auth";
import Link from "next/link";
import { headers } from "next/headers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function safeCallbackPath(raw: string) {
  // Only allow in-app redirects.
  return raw.startsWith("/") ? raw : "/";
}

async function getRedirectTo(rawCallbackUrl: string) {
  // Prefer AUTH_URL in production; fall back to forwarded headers.
  const base = process.env.AUTH_URL;
  if (base) return new URL(safeCallbackPath(rawCallbackUrl), base).toString();

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;
  return new URL(safeCallbackPath(rawCallbackUrl), origin).toString();
}

export default async function SignInPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const callbackUrl = typeof sp.callbackUrl === "string" ? sp.callbackUrl : "/";
  const error = typeof sp.error === "string" ? sp.error : "";
  const created = typeof sp.created === "string" ? sp.created : "";
  const emailPrefill = typeof sp.email === "string" ? sp.email : "";

  async function signInWithPassword(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const remember = formData.get("remember") ? "on" : "off";
    const redirectTo = await getRedirectTo(callbackUrl);
    await signIn("credentials", { email, password, remember, redirectTo });
  }

  async function signInDemo() {
    "use server";
    const redirectTo = await getRedirectTo(callbackUrl);
    await signIn("credentials", { demo: "on", remember: "on", redirectTo });
  }

  return (
    <Card title="Sign in" description="Use your email and password to access your workspace.">
      {created === "1" ? (
        <div className="mt-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200 ring-1 ring-emerald-500/20">
          Account created. Sign in to continue.
        </div>
      ) : null}
      {error ? (
        <div className="mt-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-500/20">
          {error === "CredentialsSignin" ? "Invalid email or password." : `Sign-in error: ${error}`}
        </div>
      ) : null}

      <form action={signInDemo} className="mt-3">
        <Button className="w-full" variant="secondary" type="submit">
          Try the demo (no account needed)
        </Button>
      </form>

      <form action={signInWithPassword} className="mt-3 space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">Email</label>
          <Input
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
            defaultValue={emailPrefill}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">Password</label>
          <Input
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              name="remember"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            Remember me
          </label>
          <div className="text-xs text-white/60">Redirect to: {callbackUrl}</div>
        </div>
        <Button className="w-full" type="submit">
          Sign in
        </Button>
      </form>

      <div className="mt-4 text-center text-sm text-white/70">
        New here?{" "}
        <Link className="underline decoration-white/20 underline-offset-4" href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
          Create an account
        </Link>
      </div>
    </Card>
  );
}

