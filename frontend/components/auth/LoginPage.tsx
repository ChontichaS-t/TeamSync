"use client";

import {
  Eye,
  EyeOff,
  Link2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type APIError = {
  error?: string;
};

export default function LoginPage() {
	const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    }).then((response) => {
      if (response.ok) {
        router.replace("/home");
      }
    }).catch(() => undefined);
    return () => controller.abort();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as APIError;
        setError(result.error ?? "Unable to sign in. Please try again.");
        return;
      }
      router.replace("/home");
      router.refresh();
    } catch {
      setError("Cannot connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell login-page-shell">
      <nav className="auth-navbar" aria-label="Main navigation">
        <a className="brand" href="/home" aria-label="TeamSync home">
          <span>TeamSync</span>
        </a>
        <a className="auth-navbar-cta" href="/register">Sign up</a>
      </nav>
      <div className="login-scenery" aria-hidden="true">
        <video
          className="login-video-background"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => { event.currentTarget.playbackRate = 0.8; }}
        >
          <source src="/skybg.mp4" type="video/mp4" />
        </video>
      </div>
      <section className="login-card scenic-login-card" aria-label="TeamSync sign in">
        <aside className="brand-panel">
          <a className="brand" href="#" aria-label="TeamSync home">
            <span className="brand-mark"><Link2 aria-hidden="true" /></span>
            <span>TeamSync</span>
          </a>

          <div className="brand-copy">
            <h1>
              One team.<br />
              One project.<br />
              <span>One shared view.</span>
            </h1>
            <p>
              Experience soft productivity. A modern workspace designed for teams
              who value clarity and collaborative flow.
            </p>
          </div>
          <div className="decor decor-one" aria-hidden="true" />
          <div className="decor decor-two" aria-hidden="true" />
        </aside>

        <section className="form-panel">
          <div className="form-wrap">
            <header className="form-heading">
              <h2>Welcome back</h2>
              <p>Sign in to continue to your workspace</p>
            </header>

            <form onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="email">Email Address</label>
              <div className="field">
                <Mail aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  aria-invalid={Boolean(error)}
                  required
                  suppressHydrationWarning
                />
              </div>

              <label className="field-label" htmlFor="password">Password</label>
              <div className="field">
                <LockKeyhole aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                  required
                  suppressHydrationWarning
                />
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  suppressHydrationWarning
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>

              <div className="form-options">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    suppressHydrationWarning
                  />
                  <span className="custom-check" aria-hidden="true" />
                  Remember me
                </label>
                <a href="#">Forgot password?</a>
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}

              <button className="sign-in-button" type="submit" disabled={isSubmitting} suppressHydrationWarning>
                <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
              </button>
            </form>

            <div className="divider" aria-hidden="true">
              <span />
              <p>OR CONTINUE WITH</p>
              <span />
            </div>

            <div className="social-row">
              <button type="button" disabled title="Google sign-in is not configured yet" suppressHydrationWarning>
                <Image src="/google-g.png" alt="" width={18} height={18} aria-hidden="true" />
                <span>Google</span>
              </button>
            </div>

            <p className="signup-copy">
              Don&apos;t have an account? <a href="/register">Sign up</a>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
