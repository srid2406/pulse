import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type User = {
  id: string;
  email: string;
  name?: string;
  avatar?: string | null;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
  accessToken: string | null;
  refreshToken: string | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
  accessToken: null,
  refreshToken: null,
});

const ALLOWED_EMAILS = import.meta.env.VITE_ALLOWED_EMAILS?.split(",") || [];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email && ALLOWED_EMAILS.includes(session.user.email)) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name ?? session.user.email,
          avatar: session.user.user_metadata?.avatar_url ?? null,
        });
        setAccessToken(session.provider_token ?? null);
        setRefreshToken(session.provider_refresh_token ?? null);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (
          session?.user?.email &&
          ALLOWED_EMAILS.includes(session.user.email)
        ) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name ?? session.user.email,
            avatar: session.user.user_metadata?.avatar_url ?? null,
          });
          setAccessToken(session.provider_token ?? null);
          setRefreshToken(session.provider_refresh_token ?? null);
        } else {
          setUser(null);
          setAccessToken(null);
          setRefreshToken(null);
        }
        setLoading(false);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        scopes: "https://www.googleapis.com/auth/calendar.readonly",
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signOut, accessToken, refreshToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
