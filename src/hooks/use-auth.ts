import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limiter";
import { logger, identifyUser, clearUserIdentity } from "@/lib/logger";
import type { User, Session } from "@supabase/supabase-js";

type AuthErrorLike = { message: string } | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Se houver erro de refresh token, limpar sessão local
      if (error && error.message.includes("Refresh Token")) {
        logger.warn("auth.session.refresh_failed", null, { reason: error.message });
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      logger.info("auth.session.bootstrap", { hasSession: Boolean(session?.user) });
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      logger.info("auth.state.changed", {
        event: _event,
        hasSession: Boolean(session?.user),
      });

      // Identificar/limpar usuário no logger
      if (session?.user) {
        identifyUser(session.user.id, session.user.email);
      } else {
        clearUserIdentity();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const emailDomain = email.includes("@") ? email.split("@")[1] : "unknown";
    // ✅ Rate limiting: 3 tentativas por 10 min
    try {
      enforceRateLimit("auth:signup");
    } catch (e) {
      if (e instanceof RateLimitError) {
        logger.warn("auth.signup.rate_limited", e, { emailDomain });
        return { error: { message: e.message } as AuthErrorLike };
      }
      throw e;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      logger.warn("auth.signup.failed", null, { emailDomain, reason: error.message });
    } else {
      logger.info("auth.signup.succeeded", { emailDomain });
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const emailDomain = email.includes("@") ? email.split("@")[1] : "unknown";
    // ✅ Rate limiting: 5 tentativas por 5 min
    try {
      enforceRateLimit("auth:signin");
    } catch (e) {
      if (e instanceof RateLimitError) {
        logger.warn("auth.signin.rate_limited", e, { emailDomain });
        return { error: { message: e.message } as AuthErrorLike };
      }
      throw e;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logger.warn("auth.signin.failed", null, { emailDomain, reason: error.message });
    } else {
      logger.info("auth.signin.succeeded", { emailDomain });
    }
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.warn("auth.signout.failed", null, { reason: error.message });
      return;
    }
    logger.info("auth.signout.succeeded");
  };

  return { user, session, loading, signUp, signIn, signOut };
}
