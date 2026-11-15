import type { User } from "@supabase/supabase-js";
import { requireSupabase, supabase } from "./supabase";

export type Session = {
  userId: string;
  name: string;
  email: string;
  isGuest: false;
};

export function sessionFromUser(user: User | null | undefined): Session | null {
  if (!user) return null;
  const metadata = user.user_metadata;
  const displayName = [metadata?.display_name, metadata?.name].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return {
    userId: user.id,
    name: displayName?.trim() || user.email?.split("@")[0] || "Account",
    email: user.email || "",
    isGuest: false,
  };
}

// Only known, actionable messages reach the UI; provider internals are not displayed.
export function authErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code) : "";
  switch (code) {
    case "invalid_credentials": return "Email or password is incorrect.";
    case "email_not_confirmed": return "Confirm your email before signing in. Check your inbox for the confirmation link.";
    case "user_already_exists": case "email_exists": return "Unable to create this account. Try signing in or resetting your password.";
    case "weak_password": return "Choose a stronger password with at least 8 characters, including letters, numbers, and symbols.";
    case "same_password": return "Choose a password different from your current password.";
    case "over_request_rate_limit": case "over_email_send_rate_limit": return "Too many attempts. Please wait a few minutes and try again.";
    case "otp_expired": case "flow_state_expired": case "flow_state_not_found":
    case "session_not_found": case "refresh_token_not_found": return "This link or session has expired. Request a new password reset email or sign in again.";
    default: return "Unable to complete this request. Check your connection and try again. If you used an email link, it may have expired; request a new one.";
  }
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return sessionFromUser(data.session?.user);
}

export async function signIn(email: string, password: string): Promise<void> {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  if (!data.session) throw new Error("No account session was created.");
}

export async function signUp(name: string, email: string, password: string): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await requireSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: name.trim() },
      emailRedirectTo: new URL("/login", window.location.origin).href,
    },
  });
  if (error) throw error;
  return { needsEmailConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function continueAsGuest(): Promise<void> {
  // Guest mode has no identity. A failed sign-out must not silently enter the editor.
  await signOut();
}
