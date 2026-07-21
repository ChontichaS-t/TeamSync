"use client";

import { Eye, EyeOff, Link2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type APIError = { error?: string };

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    }).then((response) => {
      if (response.ok) router.replace("/home");
    }).catch(() => undefined);
    return () => controller.abort();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    if ([...password].length < 12 || [...password].length > 128) {
      setError("Password must be 12 to 128 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, password }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as APIError;
        setError(result.error ?? "Unable to create your account. Please try again.");
        return;
      }
      router.replace("/login");
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
        <a className="auth-navbar-cta" href="/login">Sign in</a>
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
      <section className="login-card scenic-login-card" aria-label="Create a TeamSync account">
        <aside className="brand-panel">
          <a className="brand" href="/" aria-label="TeamSync home">
            <span className="brand-mark"><Link2 aria-hidden="true" /></span>
            <span>TeamSync</span>
          </a>
          <div className="brand-copy">
            <h1>Start together.<br />Stay aligned.<br /><span>Move forward.</span></h1>
            <p>Create your workspace identity and bring clarity to every shared project.</p>
          </div>
          <div className="decor decor-one" aria-hidden="true" />
          <div className="decor decor-two" aria-hidden="true" />
        </aside>

        <section className="form-panel register-panel">
          <div className="form-wrap">
            <header className="form-heading register-heading">
              <h2>Create account</h2>
              <p>Enter your details to get started</p>
            </header>

            <form onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="displayName">Display Name</label>
              <div className="field register-field">
                <UserRound aria-hidden="true" />
                <input id="displayName" name="displayName" autoComplete="name" maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" required suppressHydrationWarning />
              </div>

              <label className="field-label" htmlFor="email">Email Address</label>
              <div className="field register-field">
                <Mail aria-hidden="true" />
                <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required suppressHydrationWarning />
              </div>

              <label className="field-label" htmlFor="password">Password</label>
              <div className="field register-field">
                <LockKeyhole aria-hidden="true" />
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="12–128 characters" required suppressHydrationWarning />
                <button className="icon-button" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} suppressHydrationWarning>
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>

              <label className="field-label" htmlFor="confirmation">Confirm Password</label>
              <div className="field register-field">
                <LockKeyhole aria-hidden="true" />
                <input id="confirmation" name="confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required suppressHydrationWarning />
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="sign-in-button" type="submit" disabled={isSubmitting} suppressHydrationWarning>
                <span>{isSubmitting ? "Creating account..." : "Create account"}</span>
              </button>
            </form>

            <p className="signup-copy register-login-copy">Already have an account? <a href="/login">Sign in</a></p>
          </div>
        </section>
      </section>
    </main>
  );
}
