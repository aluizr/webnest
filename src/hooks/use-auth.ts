import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Identificar/limpar usuário no logger
      if (session?.user) {
        logger.identifyUser(session.user.id, session.user.email);
      } else {
        logger.clearUserIdentity();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    // ✅ Rate limiting: 3 tentativas por 10 min
    try {
      enforceRateLimit("auth:signup");
    } catch (e) {
      if (e instanceof RateLimitError) {
        return { error: { message: e.message } as any };
      }
      throw e;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      logger.warn("Falha no cadastro", { email, reason: error.message });
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // ✅ Rate limiting: 5 tentativas por 5 min
    try {
      enforceRateLimit("auth:signin");
    } catch (e) {
      if (e instanceof RateLimitError) {
        return { error: { message: e.message } as any };
      }
      throw e;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logger.warn("Falha no login", { email, reason: error.message });
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signUp, signIn, signOut };
}
