"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  Link2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="page-shell">
      <section className="login-card" aria-label="TeamSync sign in">
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
                  defaultValue="chonticha@teamsync.demo"
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
                  defaultValue="teamsync123"
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

              <button className="sign-in-button" type="submit" suppressHydrationWarning>
                <span>Sign in</span>
                <ArrowRight aria-hidden="true" />
              </button>
            </form>

            <div className="divider" aria-hidden="true">
              <span />
              <p>OR CONTINUE WITH</p>
              <span />
            </div>

            <div className="social-row">
              <button type="button" suppressHydrationWarning>
                <Image src="/google-g.png" alt="" width={18} height={18} aria-hidden="true" />
                <span>Google</span>
              </button>
            </div>

            <p className="signup-copy">
              Don&apos;t have an account? <a href="#">Request early access</a>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
