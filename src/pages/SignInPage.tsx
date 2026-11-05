import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  KeyRound,
  LogOut,
} from "lucide-react";
import logo from "../assets/logo.png";
import { useAuth } from "../lib/auth";
import { Copyright } from "../components/Copyright";
import { safeNext } from "../lib/safeNext";

type Tab = "signin" | "signup" | "reset";

export function SignInPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [tab, setTab] = useState<Tab>(
    params.get("tab") === "signup" ? "signup" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; notice?: string }>({});

  useEffect(() => {
    document.title = "Sign in — VATRIX";
  }, []);

  const run = async (
    e: FormEvent,
    action: () => Promise<{ error?: string; notice?: string }>,
    goNext = false,
  ) => {
    e.preventDefault();
    setBusy(true);
    setMsg({});
    const r = await action();
    setBusy(false);
    setMsg(r);
    if (!r.error && !r.notice && goNext) navigate(next, { replace: true });
  };

  const header = (
    <Link to="/" className="landing-brand auth-brand">
      <img src={logo} alt="" />
      <span>
        <strong>VATRIX</strong>
        <small>Visual Learning Space</small>
      </span>
    </Link>
  );

  if (!auth.enabled)
    return (
      <main className="auth-page">
        <section className="auth-card">
          {header}
          <h1>Accounts are not set up yet</h1>
          <p className="auth-lead">
            Student and teacher sign-in needs the Supabase database. Add{" "}
            <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> (see the README), then reload.
            Until then the labs work without an account.
          </p>
          <Link className="btn btn-secondary" to="/">
            <ArrowLeft size={14} /> Back to home
          </Link>
        </section>
        <Copyright />
      </main>
    );

  if (auth.user && auth.recovering)
    return (
      <main className="auth-page">
        <section className="auth-card">
          {header}
          <h1>Choose a new password</h1>
          <form onSubmit={(e) => run(e, () => auth.setNewPassword(password))}>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Messages {...msg} />
            <button className="btn btn-primary btn-lg" disabled={busy}>
              <KeyRound size={15} /> Save password
            </button>
          </form>
        </section>
        <Copyright />
      </main>
    );

  if (auth.user)
    return (
      <main className="auth-page">
        <section className="auth-card">
          {header}
          <h1>You're signed in</h1>
          <div className="auth-account">
            <span className={`auth-role ${auth.profile?.role ?? "student"}`}>
              {auth.profile?.role === "teacher" ? (
                <BookOpen size={14} />
              ) : (
                <GraduationCap size={14} />
              )}
              {auth.profile?.role === "teacher" ? "Teacher" : "Student"}
            </span>
            <strong>{auth.profile?.name ?? "…"}</strong>
            <small>{auth.user.email}</small>
          </div>
          <Messages
            {...msg}
            error={msg.error ?? auth.profileError ?? undefined}
          />
          {auth.profileError && (
            <button className="btn btn-secondary" onClick={auth.reloadProfile}>
              Try again
            </button>
          )}
          <div className="auth-actions">
            <Link
              className="btn btn-primary btn-lg"
              to={
                next !== "/"
                  ? next
                  : auth.profile?.role === "teacher"
                    ? "/algorithms?mode=teacher"
                    : "/algorithms?mode=student"
              }
            >
              Continue
            </Link>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => void auth.signOut()}
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </section>
        <Copyright />
      </main>
    );

  return (
    <main className="auth-page">
      <section className="auth-card">
        {header}
        <h1>
          {tab === "signup"
            ? "Create your account"
            : tab === "reset"
              ? "Reset your password"
              : "Sign in"}
        </h1>
        <p className="auth-lead">
          {tab === "reset"
            ? "Enter your email and we'll send you a link to choose a new password."
            : "Students track their practice and progress. Teachers see the whole class. Exploring the visualizers needs no account."}
        </p>
        {tab !== "reset" && (
          <div className="auth-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "signin"}
              className={tab === "signin" ? "on" : ""}
              onClick={() => {
                setTab("signin");
                setMsg({});
              }}
            >
              Sign in
            </button>
            <button
              role="tab"
              aria-selected={tab === "signup"}
              className={tab === "signup" ? "on" : ""}
              onClick={() => {
                setTab("signup");
                setMsg({});
              }}
            >
              Create account
            </button>
          </div>
        )}
        <form
          onSubmit={(e) =>
            tab === "signin"
              ? run(e, () => auth.signIn(email, password), true)
              : tab === "signup"
                ? run(e, () => auth.signUp(name, email, password), true)
                : run(e, () => auth.sendReset(email))
          }
        >
          {tab === "signup" && (
            <label>
              Full name
              <input
                autoComplete="name"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {tab !== "reset" && (
            <label>
              Password
              <input
                type="password"
                autoComplete={
                  tab === "signup" ? "new-password" : "current-password"
                }
                required
                minLength={tab === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {tab === "signup" && <small>At least 8 characters.</small>}
            </label>
          )}
          <Messages {...msg} />
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy
              ? "Please wait…"
              : tab === "signin"
                ? "Sign in"
                : tab === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </button>
        </form>
        <div className="auth-links">
          {tab === "signin" && (
            <button
              onClick={() => {
                setTab("reset");
                setMsg({});
              }}
            >
              Forgot your password?
            </button>
          )}
          {tab === "reset" && (
            <button
              onClick={() => {
                setTab("signin");
                setMsg({});
              }}
            >
              <ArrowLeft size={13} /> Back to sign in
            </button>
          )}
          {tab === "signup" && (
            <span>
              New accounts are student accounts. Teachers: ask the site owner to
              add your email to the teacher list.
            </span>
          )}
          <Link to="/">Continue without an account</Link>
        </div>
      </section>
      <Copyright />
    </main>
  );
}

function Messages({ error, notice }: { error?: string; notice?: string }) {
  if (error)
    return (
      <p className="auth-msg error" role="alert">
        {error}
      </p>
    );
  if (notice)
    return (
      <p className="auth-msg notice" role="status">
        {notice}
      </p>
    );
  return null;
}
