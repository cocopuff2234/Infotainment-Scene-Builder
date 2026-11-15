// Mock auth service for the login page.
//
// TODO: replace the bodies of signIn / signUp with the real auth
// provider (Firebase, Supabase, custom backend...) once the team
// decides. The login page only depends on the functions exported here.

export type Session = {
  name: string;
  email: string;
  isGuest: boolean;
};

const STORAGE_KEY = "infotainment-scene-builder:session";

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode, etc.). The session
    // simply won't survive a page refresh.
  }
}

// Simulates network latency so loading states can be tested.
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function signIn(email: string, _password: string) {
  await wait(400);

  saveSession({
    name: email.split("@")[0],
    email,
    isGuest: false,
  });
}

export async function signUp(
  name: string,
  email: string,
  _password: string,
) {
  await wait(400);

  saveSession({ name, email, isGuest: false });
}

export function continueAsGuest() {
  saveSession({ name: "Guest", email: "", isGuest: true });
}

export function signOut() {
  saveSession(null);
}