import { useState } from "react";
import type { FormEvent } from "react";

import {
  continueAsGuest,
  getSession,
  signIn,
  signOut,
  signUp,
} from "../services/auth";
import type { Session } from "../services/auth";

// Reuse the editor's theme and base styles (eyebrow, inputs, labels,
// secondary-button) without modifying them.
import "../App.css";
import "./LoginPage.css";

type Mode = "signin" | "signup";

function goToEditor() {
  window.location.assign("/");
}

export function LoginPage() {
  const [session, setSession] = useState<Session | null>(getSession);

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === "signup";

  function validate(): string {
    if (isSignUp && !name.trim()) {
      return "Please enter your name.";
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return "Enter a valid email address.";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validate();
    setError(validationError);

    if (validationError) {
      return;
    }

    setSubmitting(true);

    try {
      if (isSignUp) {
        await signUp(name.trim(), email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }

      goToEditor();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function handleGuest() {
    continueAsGuest();
    goToEditor();
  }

  function handleSignOut() {
    signOut();
    setSession(null);
  }

  function toggleMode() {
    setMode(isSignUp ? "signin" : "signup");
    setError("");
  }

  // Already has a session: offer to continue or sign out.
  if (session) {
    return (
      <main className="login-page">
        <div className="login-card">
          <p className="eyebrow">Infotainment Scene Builder</p>
          <h1>Welcome back</h1>

          <p className="login-subtitle">
            You're signed in as{" "}
            {session.isGuest ? "a guest" : session.email}.
          </p>

          <div className="login-actions">
            <button
              type="button"
              className="primary-button"
              onClick={goToEditor}
            >
              Continue to editor
            </button>

            <button
              type="button"
              className="secondary-button guest-button"
              onClick={handleSignOut}
            >
              {session.isGuest ? "Exit guest mode" : "Sign out"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <p className="eyebrow">Infotainment Scene Builder</p>
        <h1>{isSignUp ? "Create account" : "Sign in"}</h1>

        <p className="login-subtitle">
          {isSignUp
            ? "Create an account to save and share your scenes."
            : "Welcome back. Sign in to pick up where you left off."}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {isSignUp && (
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                isSignUp ? "new-password" : "current-password"
              }
            />
          </label>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting
              ? "Please wait..."
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="login-switch">
          {isSignUp
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <button
            type="button"
            className="link-button"
            onClick={toggleMode}
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="secondary-button guest-button"
          onClick={handleGuest}
        >
          Continue as guest
        </button>

        <p className="hint">
          Guests can design and export scenes. Cloud saving and
          sharing require an account.
        </p>
      </div>
    </main>
  );
}