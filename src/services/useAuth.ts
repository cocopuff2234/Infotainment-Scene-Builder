import { useEffect, useState } from "react";
import { authErrorMessage, getSession, sessionFromUser, type Session } from "./auth";
import { supabase } from "./supabase";

type AuthState = { session: Session | null; loading: boolean; error: string | null };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ session: null, loading: !!supabase, error: null });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let revision = 0;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keep this synchronous: awaiting auth methods here can deadlock the SDK lock.
      revision += 1;
      if (active) setState({ session: sessionFromUser(session?.user), loading: false, error: null });
    });
    const initialRevision = revision;
    void getSession().then(
      (session) => {
        if (active && revision === initialRevision) setState({ session, loading: false, error: null });
      },
      (error: unknown) => {
        if (active && revision === initialRevision) setState({ session: null, loading: false, error: authErrorMessage(error) });
      },
    );
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
