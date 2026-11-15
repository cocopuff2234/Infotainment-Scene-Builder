import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function isPublicKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return false;
  // Legacy keys are JWTs. Never ship a service-role credential to the browser.
  const payload = key.split(".")[1];
  if (payload) {
    try {
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(normalized)) as { role?: string };
      if (decoded.role === "service_role") return false;
    } catch {
      return false;
    }
  }
  return key.startsWith("sb_publishable_") || key.split(".").length === 3;
}

type Configuration = { client: SupabaseClient | null; error: string | null };

function createConfiguredClient(): Configuration {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    import.meta.env.VITE_SUPABASE_ANON_KEY?.trim());
  if (!url || !key) {
    const missing = [!url && "VITE_SUPABASE_URL", !key && "VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)"].filter(Boolean).join(" and ");
    return { client: null, error: `Vite did not load ${missing}. Check the root .env.local file, fully restart the development server, and open the URL printed by that server.` };
  }
  if (!isPublicKey(key)) {
    return { client: null, error: key.startsWith("sb_secret_")
      ? "The configured key is a secret key. Replace it with a publishable or legacy anon key, then restart Vite. Secret keys must never be used in the browser."
      : "The configured API key was rejected. Use a publishable key (sb_publishable_…) or a legacy anon JWT—not the project ID, database password, or service-role key—then restart Vite." };
  }

  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Unsupported URL protocol");
  } catch {
    return { client: null, error: "VITE_SUPABASE_URL is not a valid HTTP(S) URL. Use the Supabase HTTPS Project URL, not a PostgreSQL connection string, then restart Vite." };
  }
  try {
    return { client: createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }), error: null };
  } catch {
    // SDK errors can include configuration details; never echo credentials into the UI.
    return { client: null, error: "The URL and key were loaded, but the Supabase client could not initialize. Check browser storage permissions and the Project URL/key format, then restart Vite." };
  }
}

const configuration = createConfiguredClient();
export const supabase: SupabaseClient | null = configuration.client;
export const supabaseConfigurationError: string | null = configuration.error;
export const supabaseConfigured: boolean = supabase !== null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error(supabaseConfigurationError ?? "Account services are not configured. Continue as a guest instead.");
  return supabase;
}
