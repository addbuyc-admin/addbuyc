"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/browser";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string | null;
  refreshDisplayName: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  displayName: null,
  refreshDisplayName: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const fetchDisplayName = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    setDisplayName(data?.display_name ?? null);
  }, []);

  const refreshDisplayName = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const uid = currentSession?.user?.id;
    if (uid) await fetchDisplayName(uid);
  }, [fetchDisplayName]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        void fetchDisplayName(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        void fetchDisplayName(session.user.id);
      } else {
        setDisplayName(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchDisplayName]);

  return (
    <AuthContext.Provider value={{ user, session, loading, displayName, refreshDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
