/* Student and teacher accounts (Supabase Auth, email + password).
 * The role comes from the `profiles` table, which the database fills in on sign-up:
 * emails listed in `teacher_emails` become teachers, everyone else is a student.
 * Without Supabase configured, `enabled` is false and the site keeps its old name-only mode. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { clearAccountCaches } from "../domain/tracking";
import { supabase } from "./supabase";

export type Role = "student" | "teacher";
export type Profile = { id: string; name: string; email: string; role: Role };

type Result = { error?: string; notice?: string };

export type Auth = {
  /** False when Supabase is not configured (accounts are unavailable). */
  enabled: boolean;
  /** True until the stored session (if any) has been checked. */
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  /** Set when the profile (name and role) could not be loaded after retrying. */
  profileError: string | null;
  /** Try loading the profile again (after profileError). */
  reloadProfile: () => void;
  /** The user arrived from a password-reset email and should choose a new password. */
  recovering: boolean;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (name: string, email: string, password: string) => Promise<Result>;
  sendReset: (email: string) => Promise<Result>;
  setNewPassword: (password: string) => Promise<Result>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

const friendly = (message: string) =>
  /invalid login/i.test(message)
    ? "That email and password don't match an account."
    : /email not confirmed/i.test(message)
      ? "Please confirm your email first — check your inbox for the link."
      : /already registered|already exists/i.test(message)
        ? "An account with this email already exists. Sign in instead."
        : message;

const back = () => `${window.location.origin}/signin`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(!!supabase);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [recovering, setRecovering] = useState(false);
  const userId = user?.id ?? null;
  const latestUser = useRef(user);
  latestUser.current = user;

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Load the profile (name and role) when a different user signs in. Keyed on the id, not the
  // user object, which Supabase replaces on every hourly session refresh.
  useEffect(() => {
    setProfile(null); // never show the previous account's role while the new one loads
    setProfileError(null);
    if (!supabase || !userId) return;
    let alive = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const { data, error } = await supabase!
        .from("profiles")
        .select("id, name, email, role")
        .eq("id", userId)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        // A failed request must not quietly turn a teacher into a student: retry, then report it.
        tries++;
        if (tries < 3) timer = setTimeout(load, 1000 * tries);
        else
          setProfileError(
            "We couldn't load your account. Check your connection and try again.",
          );
        return;
      }
      const u = latestUser.current;
      // No profile row means the database schema hasn't been run yet: fall back to a student.
      setProfile(
        (data as Profile | null) ?? {
          id: userId,
          name:
            (u?.user_metadata?.full_name as string) ||
            u?.email?.split("@")[0] ||
            "Student",
          email: u?.email ?? "",
          role: "student",
        },
      );
    };
    void load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [userId, profileAttempt]);

  const reloadProfile = useCallback(() => setProfileAttempt((n) => n + 1), []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<Result> => {
      const { error } = await supabase!.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return error ? { error: friendly(error.message) } : {};
    },
    [],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<Result> => {
      const { data, error } = await supabase!.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: back() },
      });
      if (error) return { error: friendly(error.message) };
      return data.session
        ? {}
        : {
            notice: `We sent a confirmation link to ${email.trim()}. Open it, then sign in.`,
          };
    },
    [],
  );

  const sendReset = useCallback(async (email: string): Promise<Result> => {
    const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: back(),
    });
    return error
      ? { error: friendly(error.message) }
      : {
          notice: `If an account exists for ${email.trim()}, a reset link is on its way.`,
        };
  }, []);

  const setNewPassword = useCallback(
    async (password: string): Promise<Result> => {
      const { error } = await supabase!.auth.updateUser({ password });
      if (error) return { error: friendly(error.message) };
      setRecovering(false);
      return { notice: "Password updated. You're signed in." };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    clearAccountCaches();
    setRecovering(false);
  }, []);

  const value = useMemo<Auth>(
    () => ({
      enabled: !!supabase,
      loading,
      user,
      profile,
      profileError,
      reloadProfile,
      recovering,
      signIn,
      signUp,
      sendReset,
      setNewPassword,
      signOut,
    }),
    [
      loading,
      user,
      profile,
      profileError,
      reloadProfile,
      recovering,
      signIn,
      signUp,
      sendReset,
      setNewPassword,
      signOut,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const a = useContext(AuthContext);
  if (!a) throw new Error("useAuth must be used inside <AuthProvider>");
  return a;
}
