import { useEffect, useState, type FormEvent } from "react";
import { authErrorMessage, continueAsGuest, signIn, signOut, signUp } from "../services/auth";
import { requireSupabase, supabase, supabaseConfigured, supabaseConfigurationError } from "../services/supabase";
import { useAuth } from "../services/useAuth";
import { BackLink } from "../components/BackLink";
import "../App.css";
import "./LoginPage.css";

type Mode = "signin" | "signup" | "forgot" | "update";

function initialMode(): Mode {
  const value = new URLSearchParams(window.location.search).get("mode");
  return value === "signup" || value === "forgot" || value === "update" ? value : "signin";
}

function goToEditor() {
  window.location.assign("/editor");
}

const titles: Record<Mode, string> = {
  signin: "Sign in", signup: "Create account", forgot: "Reset your password", update: "Set a new password",
};
const subtitles: Record<Mode, string> = {
  signin: "Welcome back. Sign in to pick up where you left off.",
  signup: "Create an account to keep your scenes connected to you.",
  forgot: "We'll send you a link to choose a new password.",
  update: "Use the link in your reset email, then choose a new password below.",
};

export function LoginPage() {
  const { session, loading, error: sessionError } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    return query.has("error") || hash.has("error")
      ? "This email link could not be used. It may have expired. Request a new link or sign in again." : "";
  });
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const busy = loading || submitting;
  const isSignUp = mode === "signup";
  const isUpdate = mode === "update";
  const showAccount = session && mode !== "update" && mode !== "forgot";

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update");
        setError("");
        setNotice("");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmation("");
    const url = new URL(window.location.href);
    url.searchParams.set("mode", next);
    window.history.replaceState(null, "", url);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !supabaseConfigured) return;
    setError("");
    setNotice("");
    if (isSignUp && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!isUpdate && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode !== "forgot" && (!password || ((isSignUp || isUpdate) && password.length < 8))) {
      setError(isSignUp || isUpdate ? "Password must be at least 8 characters." : "Enter your password.");
      return;
    }
    if (isUpdate && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    if (isUpdate && !session) {
      setError("Open a valid password reset link first, or request a new one.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "forgot") {
        const { error: resetError } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
          redirectTo: new URL("/login?mode=update", window.location.origin).href,
        });
        if (resetError) throw resetError;
        setNotice("If an account exists for that email, you'll receive a password reset link. Check your inbox and spam folder.");
      } else if (isUpdate) {
        const { error: updateError } = await requireSupabase().auth.updateUser({ password });
        if (updateError) throw updateError;
        changeMode("signin");
        setNotice("Your password has been updated. You can continue to the editor.");
      } else if (isSignUp) {
        const result = await signUp(name, email, password);
        if (result.needsEmailConfirmation) {
          changeMode("signin");
          setNotice("Check your email for a confirmation link before signing in. If you already have an account, sign in or reset your password.");
        } else {
          goToEditor();
        }
      } else {
        await signIn(email, password);
        goToEditor();
      }
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGuest() {
    if (busy) return;
    setSubmitting(true);
    setError("");
    try {
      await continueAsGuest();
      goToEditor();
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    if (busy) return;
    setSubmitting(true);
    setError("");
    try {
      await signOut();
      changeMode("signin");
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-layout">
        <nav className="login-back-navigation" aria-label="Back navigation">
          <BackLink href="/">Back to home</BackLink>
          {!showAccount && mode !== "signin" && <BackLink onClick={() => changeMode("signin")} disabled={busy}>Back to sign in</BackLink>}
        </nav>
      <div className="login-card" aria-busy={busy}>
        <p className="eyebrow">Infotainment Scene Builder</p>
        <h1>{showAccount ? "Welcome back" : titles[mode]}</h1>
        <p className="login-subtitle">
          {showAccount ? `You're signed in as ${session.email || session.name}.` : subtitles[mode]}
        </p>

        {!supabaseConfigured && (
          <p className="login-warning" role="status">
            {supabaseConfigurationError} You can still design locally as a guest.
          </p>
        )}
        {loading && <p className="login-status" role="status">Checking your session…</p>}
        {(error || sessionError) && <p className="login-error" role="alert">{error || sessionError}</p>}
        {notice && <p className="login-notice" role="status">{notice}</p>}

        {showAccount ? (
          <div className="login-actions">
            <button type="button" className="primary-button" disabled={busy} onClick={goToEditor}>Continue to editor</button>
            <button type="button" className="secondary-button guest-button" disabled={busy} onClick={() => { void handleSignOut(); }}>Sign out</button>
          </div>
        ) : (
          <>
            <form onSubmit={(event) => { void handleSubmit(event); }} noValidate>
              <fieldset disabled={busy || !supabaseConfigured}>
                {isSignUp && (
                  <label>Name
                    <input type="text" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={100} required />
                  </label>
                )}
                {!isUpdate && (
                  <label>Email
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                  </label>
                )}
                {mode !== "forgot" && (
                  <label>{isUpdate ? "New password" : "Password"}
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignUp || isUpdate ? "new-password" : "current-password"} minLength={isSignUp || isUpdate ? 8 : undefined} required />
                  </label>
                )}
                {isUpdate && (
                  <label>Confirm new password
                    <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required />
                  </label>
                )}
                {isUpdate && !loading && !session && <p className="login-status">Open your reset email link to continue, or request a new link below.</p>}
                <button type="submit" className="primary-button" disabled={busy || !supabaseConfigured || (isUpdate && !session)}>
                  {submitting ? "Please wait…" : mode === "forgot" ? "Send reset link" : isUpdate ? "Update password" : titles[mode]}
                </button>
              </fieldset>
            </form>
            <div className="login-switch">
              <button type="button" className="link-button" disabled={busy} onClick={() => changeMode(isSignUp ? "signin" : "signup")}>
                {isSignUp ? "Already have an account? Sign in" : "Create an account"}
              </button>

              {mode !== "forgot" && <button type="button" className="link-button" disabled={busy} onClick={() => changeMode("forgot")}>{isUpdate ? "Request a new reset link" : "Forgot password?"}</button>}
            </div>
          </>
        )}
        <div className="login-divider"><span>or</span></div>
        <button type="button" className="secondary-button guest-button" disabled={busy} onClick={() => { void handleGuest(); }}>
          {session ? "Sign out and continue as guest" : "Continue as guest"}
        </button>
        <p className="hint">Guests can design and export scenes locally. Guest mode does not create an account.</p>
      </div>
      </div>
    </main>
  );
}
