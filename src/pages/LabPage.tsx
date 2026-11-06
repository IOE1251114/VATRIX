import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  Code2,
  GitBranch,
  GraduationCap,
  House,
  Lock,
  LogIn,
  LogOut,
  Menu,
  Network,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import logo from "../assets/logo.png";
import { useAuth } from "../lib/auth";
import { Copyright } from "../components/Copyright";
import { StudentPanel } from "../components/modes/StudentPanel";
import { TeacherDashboard } from "../components/modes/TeacherDashboard";
import { subjects } from "../domain/subjects";
import {
  slug,
  topicStats,
  useActivityTracker,
  useDB,
  withActivity,
  withAttempt,
  withStudent,
  type SyncStatus,
  type TopicRef,
} from "../domain/tracking";
import { ideaFor, topicsOf, type Mode } from "../domain/course";
import type { Course } from "../courses/types";

const STUDENT_KEY = "vatrix-student";
const syncLabel: Record<SyncStatus, string> = {
  local: "Saved in this browser",
  "signed-out": "Sign in to save your progress",
  connecting: "Connecting to the database…",
  synced: "Saved to the cloud",
  saving: "Saving…",
  offline: "Offline — saved in this browser",
};
const MASTERED = 75;

function readStudentName() {
  try {
    return localStorage.getItem(STUDENT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function LabPage({ course }: { course: Course }) {
  const { units } = course;
  const allTopics = topicsOf(units);
  const currentSubject = subjects.find((s) => s.id === course.subjectId)!;
  const [searchParams] = useSearchParams();
  const initialTopic =
    allTopics.find((t) => t.id === searchParams.get("topic"))?.id ??
    allTopics[0].id;
  const initialMode = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>(
    initialMode === "student" || initialMode === "teacher"
      ? initialMode
      : "explore",
  );
  const [activeUnit, setActiveUnit] = useState(
    () => units.find((u) => u.topics.some((t) => t.id === initialTopic))!.id,
  );
  const [activeTopic, setActiveTopic] = useState(initialTopic);
  const [search, setSearch] = useState("");
  const [showTheory, setShowTheory] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [subjectMenu, setSubjectMenu] = useState(false);
  const auth = useAuth();
  // With Supabase configured, practice and the dashboard need an account; the visualizers never do.
  const accounts = auth.enabled;
  const role = auth.profile?.role;
  const [db, updateDB, syncStatus] = useDB(
    accounts ? (auth.user?.id ?? null) : undefined,
  );
  const [studentName, setStudentName] = useState(readStudentName);

  const unit = units.find((u) => u.id === activeUnit)!;
  const topic = allTopics.find((t) => t.id === activeTopic) ?? unit.topics[0];
  const topicRefs: TopicRef[] = units.flatMap((u) =>
    u.topics.map((t) => ({
      id: t.id,
      title: t.title,
      unit: `Unit ${u.number}`,
    })),
  );
  const studentId = accounts
    ? role === "student" && auth.user
      ? auth.user.id
      : ""
    : slug(studentName);
  const student = studentId ? (db.students[studentId] ?? null) : null;
  const checkingAccount =
    accounts &&
    (auth.loading || (!!auth.user && !auth.profile && !auth.profileError));
  const accountError = accounts && !!auth.user && !!auth.profileError;
  // Teacher mode is only offered to teacher accounts (or to everyone when there are no accounts).
  const canTeach = !accounts || role === "teacher";

  // A signed-in student who opens a teacher link lands on their own practice instead.
  useEffect(() => {
    if (
      accounts &&
      auth.user &&
      auth.profile &&
      !canTeach &&
      mode === "teacher"
    )
      setMode("student");
  }, [accounts, auth.user, auth.profile, canTeach, mode]);
  const signInLink = (m: Mode) =>
    `/signin?next=${encodeURIComponent(`${window.location.pathname}?mode=${m}`)}`;

  // A signed-in student always has a progress row (the database usually creates it at sign-up).
  useEffect(() => {
    const user = auth.user,
      profile = auth.profile;
    if (!accounts || !user || profile?.role !== "student") return;
    if (syncStatus !== "synced" && syncStatus !== "offline") return;
    if (!db.students[user.id])
      updateDB((d) => withStudent(d, profile.name, false, user.id));
  }, [accounts, auth.user, auth.profile, syncStatus, db, updateDB]);
  const isMastered = (topicId: string) =>
    !!student && (topicStats(student, topicId).mastery ?? 0) >= MASTERED;
  const masteredPct = Math.round(
    (100 * allTopics.filter((t) => isMastered(t.id)).length) / allTopics.length,
  );
  useActivityTracker(
    updateDB,
    student ? studentId : null,
    mode === "explore",
    activeTopic,
  );

  // The drawer covers the page on small screens: lock scrolling behind it and close on Escape.
  useEffect(() => {
    if (!navOpen) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", close);
    };
  }, [navOpen]);

  const login = (name: string) => {
    updateDB((d) => withStudent(d, name));
    setStudentName(name.trim());
    try {
      localStorage.setItem(STUDENT_KEY, name.trim());
    } catch {
      /* storage unavailable: stay signed in for this session only */
    }
  };
  const logout = () => {
    setStudentName("");
    try {
      localStorage.removeItem(STUDENT_KEY);
    } catch {
      /* storage unavailable */
    }
  };
  const setTopic = (topicId: string) => {
    const parent = units.find((u) => u.topics.some((t) => t.id === topicId));
    if (!parent) return;
    setActiveTopic(topicId);
    setActiveUnit(parent.id);
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  };
  const openVisualizer = (topicId: string) => {
    setTopic(topicId);
    setMode("explore");
  };
  /** Forward steps taken inside a stepper count toward the signed-in student's activity. */
  const recordSteps = (k: number) => {
    if (student && mode === "explore")
      updateDB((d) => withActivity(d, studentId, activeTopic, 0, k));
  };

  const query = search.trim().toLowerCase();
  const filteredUnits = units
    .map((u) => ({
      ...u,
      topics: u.topics.filter((t) =>
        `${t.title} ${t.subtitle} ${t.tags.join(" ")}`
          .toLowerCase()
          .includes(query),
      ),
    }))
    .filter((u) => u.topics.length);

  return (
    <div className={`app-shell ${navOpen ? "nav-open" : ""}`}>
      <div className="mobile-bar">
        <button
          className="icon-button"
          aria-label="Open course menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
        >
          <Menu size={19} />
        </button>
        <Link to="/" className="mobile-brand" aria-label="VATRIX home">
          <img src={logo} alt="" />
          <strong>VATRIX</strong>
        </Link>
        <span className="mobile-topic">{topic.title}</span>
      </div>
      <div
        className="nav-backdrop"
        aria-hidden="true"
        onClick={() => setNavOpen(false)}
      />

      <aside className="sidebar" aria-label="Course navigation">
        <div className="sidebar-head">
          <Link to="/" className="brand" title="Back to home">
            <div className="brand-mark">
              <img src={logo} alt="VATRIX logo" />
            </div>
            <div>
              <strong>VATRIX</strong>
              <small>Visual Algorithm Space</small>
            </div>
          </Link>
          <button
            className="icon-button sidebar-close"
            aria-label="Close course menu"
            onClick={() => setNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="subject-switch">
          <button
            className="course-chip"
            aria-haspopup="menu"
            aria-expanded={subjectMenu}
            onClick={() => setSubjectMenu((v) => !v)}
          >
            <span className="live-dot" /> {currentSubject.title.toUpperCase()}
            <ChevronDown size={13} />
          </button>
          {subjectMenu && (
            <div className="subject-menu" role="menu">
              {subjects.map((s) =>
                s.path ? (
                  <Link
                    key={s.id}
                    to={s.path}
                    role="menuitem"
                    className={s.id === currentSubject.id ? "current" : ""}
                    onClick={() => setSubjectMenu(false)}
                  >
                    <span className="subject-menu-glyph">{s.glyph}</span>
                    {s.short}
                    {s.id === currentSubject.id && <Check size={13} />}
                  </Link>
                ) : (
                  <span key={s.id} role="menuitem" aria-disabled="true">
                    <span className="subject-menu-glyph">{s.glyph}</span>
                    {s.short}
                    <small>SOON</small>
                  </span>
                ),
              )}
              <Link
                to="/#subjects"
                role="menuitem"
                className="subject-menu-home"
              >
                <House size={13} /> All subjects
              </Link>
            </div>
          )}
        </div>

        <div className="side-label">
          COURSE CONTENT <span>{allTopics.length} TOPICS</span>
        </div>
        <div className="search-wrap">
          <Search size={15} />
          <input
            aria-label="Search topics"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a topic…"
          />
        </div>
        <nav className="unit-nav">
          {filteredUnits.map((u) => {
            // While searching, show every unit's matches instead of only the active unit.
            const expanded = query !== "" || activeUnit === u.id;
            return (
              <div className="unit-group" key={u.id}>
                <button
                  className={`unit-link ${activeUnit === u.id ? "unit-active" : ""}`}
                  aria-expanded={expanded}
                  onClick={() => setActiveUnit(u.id)}
                >
                  <span className="unit-number">{u.number}</span>
                  <span className="unit-title">{u.title}</span>
                  <span className="unit-progress">
                    {u.topics.filter((t) => isMastered(t.id)).length}/
                    {u.topics.length}
                  </span>
                </button>
                {expanded && (
                  <div className="topic-links">
                    {u.topics.map((t) => (
                      <button
                        key={t.id}
                        className={`topic-link ${activeTopic === t.id ? "topic-active" : ""}`}
                        aria-current={activeTopic === t.id ? "page" : undefined}
                        onClick={() => setTopic(t.id)}
                      >
                        <span className="topic-dot" />
                        <span>{t.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredUnits.length === 0 && (
            <p className="nav-empty">No topics match “{search}”.</p>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-progress-head">
            <span>TOPICS MASTERED</span>
            <strong>{masteredPct}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${masteredPct}%` }} />
          </div>
          <p>
            Mastered = {MASTERED}%+ on recent practice. Solve problems to build
            your profile.
          </p>
          <div className="sidebar-user">
            <div className="avatar">
              <GraduationCap size={18} />
            </div>
            <div>
              <strong>
                {accounts
                  ? (auth.profile?.name ?? "Not signed in")
                  : (student?.name ?? "Not signed in")}
              </strong>
              <small>
                {accounts
                  ? auth.user
                    ? `${role === "teacher" ? "Teacher" : "Student"} · ${auth.user.email}`
                    : "Sign in to track progress"
                  : student
                    ? "Progress is tracked"
                    : "Open Student mode to start"}
              </small>
            </div>
          </div>
          {accounts && (
            <div className="sidebar-account">
              {auth.user ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => void auth.signOut()}
                >
                  <LogOut size={13} /> Sign out
                </button>
              ) : (
                <Link className="btn btn-primary" to={signInLink(mode)}>
                  <LogIn size={13} /> Sign in
                </Link>
              )}
            </div>
          )}
          <p className={`sync-status sync-${syncStatus}`} role="status">
            <span className="sync-dot" /> {syncLabel[syncStatus]}
          </p>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>COURSE</span>
            <ArrowRight size={13} />
            <span>
              {unit.number} / {unit.title.toUpperCase()}
            </span>
            <ArrowRight size={13} />
            <strong>{topic.title}</strong>
          </div>
          <div className="topbar-right">
            <span className="status-pill">
              <span className="live-dot" /> INTERACTIVE LAB
            </span>
            <div
              className="mode-switch"
              role="group"
              aria-label="Workspace mode"
            >
              <button
                className={mode === "explore" ? "selected" : ""}
                aria-pressed={mode === "explore"}
                onClick={() => setMode("explore")}
              >
                <Sparkles size={14} /> Explore
              </button>
              <button
                className={mode === "student" ? "selected" : ""}
                aria-pressed={mode === "student"}
                onClick={() => setMode("student")}
              >
                <GraduationCap size={14} /> Student
              </button>
              {canTeach && (
                <button
                  className={mode === "teacher" ? "selected" : ""}
                  aria-pressed={mode === "teacher"}
                  onClick={() => setMode("teacher")}
                >
                  <BookOpen size={14} /> Teacher
                </button>
              )}
            </div>
          </div>
        </header>
        <div className="content-area">
          <section className="hero-card">
            <div className="hero-copy">
              <div className="eyebrow">
                <span /> UNIT {unit.number}{" "}
                <span className="eyebrow-divider">/</span>{" "}
                {unit.short.toUpperCase()}
              </div>
              <h1>
                {topic.title}
                <br />
                <span>{topic.subtitle.toLowerCase()}.</span>
              </h1>
              <p>{topic.description}</p>
              <div className="hero-pills">
                <span>
                  <Check size={13} /> Interactive experiments
                </span>
                <span>
                  <Check size={13} /> Step-by-step reasoning
                </span>
                <span>
                  <Check size={13} /> Complexity insights
                </span>
              </div>
            </div>
            <div className="hero-art">
              <div className="art-orbit orbit-a" />
              <div className="art-orbit orbit-b" />
              <div className="art-core">
                <Network size={30} />
                <small>TRACE</small>
              </div>
              <div className="art-node node-1">O(n)</div>
              <div className="art-node node-2">{unit.number}</div>
              <div className="art-node node-3">
                <GitBranch size={17} />
              </div>
              <div className="art-caption">
                MODEL <span>→</span> EXECUTE <span>→</span> PROVE
              </div>
            </div>
          </section>

          {mode === "teacher" &&
            (accounts && checkingAccount ? (
              <Gate title="Checking your account…" text="One moment." />
            ) : accountError ? (
              <Gate
                title="Couldn't load your account"
                text={auth.profileError!}
                actions={
                  <button
                    className="btn btn-primary"
                    onClick={auth.reloadProfile}
                  >
                    Try again
                  </button>
                }
              />
            ) : accounts && !auth.user ? (
              <Gate
                title="Teachers only"
                text="Sign in with a teacher account to see class progress, misconceptions and assignments."
                actions={
                  <Link className="btn btn-primary" to={signInLink("teacher")}>
                    <LogIn size={14} /> Sign in
                  </Link>
                }
              />
            ) : accounts && role !== "teacher" ? (
              <Gate
                title="Teachers only"
                text={`You're signed in as ${auth.profile?.name ?? "a student"} with a student account. Teacher access is given by the site owner: ask them to add your email to the teacher list, then sign in again.`}
                actions={
                  <button
                    className="btn btn-primary"
                    onClick={() => setMode("student")}
                  >
                    <GraduationCap size={14} /> Go to your practice
                  </button>
                }
              />
            ) : (
              <TeacherDashboard
                db={db}
                update={updateDB}
                topics={topicRefs}
                onOpenVisualizer={openVisualizer}
              />
            ))}
          {mode === "student" &&
            (accounts && checkingAccount ? (
              <Gate title="Checking your account…" text="One moment." />
            ) : accountError ? (
              <Gate
                title="Couldn't load your account"
                text={auth.profileError!}
                actions={
                  <button
                    className="btn btn-primary"
                    onClick={auth.reloadProfile}
                  >
                    Try again
                  </button>
                }
              />
            ) : accounts && !auth.user ? (
              <Gate
                title="Sign in to practise"
                text="Your answers, mastery and time in the visualizers are saved to your account, so you can pick up on any device. Exploring the visualizers needs no account."
                actions={
                  <>
                    <Link
                      className="btn btn-primary"
                      to={signInLink("student")}
                    >
                      <LogIn size={14} /> Sign in
                    </Link>
                    <Link
                      className="btn btn-secondary"
                      to={`${signInLink("student")}&tab=signup`}
                    >
                      Create a student account
                    </Link>
                  </>
                }
              />
            ) : accounts && role === "teacher" ? (
              <Gate
                title="You're signed in as a teacher"
                text="Student practice is for student accounts. Your class's results are in Teacher mode."
                actions={
                  <button
                    className="btn btn-primary"
                    onClick={() => setMode("teacher")}
                  >
                    <BookOpen size={14} /> Open Teacher mode
                  </button>
                }
              />
            ) : accounts && !student ? (
              <Gate
                title="Loading your progress…"
                text="Fetching your answers from the database."
              />
            ) : (
              <StudentPanel
                db={db}
                student={student}
                topics={topicRefs}
                activeTopic={activeTopic}
                onLogin={login}
                onLogout={accounts ? () => void auth.signOut() : logout}
                logoutLabel={accounts ? "Sign out" : undefined}
                onAttempt={(a, saved) =>
                  updateDB((d) => withAttempt(d, studentId, a), {
                    upload: !saved,
                  })
                }
                onOpenVisualizer={openVisualizer}
              />
            ))}

          {mode === "explore" && (
            <>
              <section className="learning-toolbar">
                <div>
                  <span className="kicker">CONCEPT WORKSPACE</span>
                  <h2>Learn by changing the input</h2>
                </div>
                <button
                  className="quiet-button"
                  onClick={() => setShowTheory((v) => !v)}
                >
                  <BookOpen size={15} />
                  {showTheory ? "Hide" : "Show"} theory
                </button>
              </section>
              {showTheory && (
                <>
                  <section className="theory-strip">
                    <div className="theory-icon">
                      <BrainCircuit size={19} />
                    </div>
                    <div>
                      <span className="kicker">THE IDEA</span>
                      <p>{ideaFor(course.ideas, activeTopic)}</p>
                      <div className="tag-row">
                        {topic.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="theory-complexity">
                      <small>COMPLEXITY / KEY PROPERTY</small>
                      <strong>{topic.complexity}</strong>
                    </div>
                  </section>
                  {course.notes(activeTopic)}
                </>
              )}

              {course.explorers[activeTopic]?.(recordSteps) ?? (
                <div className="panel">
                  <h2>{topic.title}</h2>
                  <p>{topic.description}</p>
                </div>
              )}
            </>
          )}

          <section className="bottom-learning">
            <div className="bottom-icon">
              <Code2 size={19} />
            </div>
            <div>
              <span className="kicker">MAKE THE REASONING EXPLICIT</span>
              <h3>Model → execute → explain → analyze</h3>
              <p>
                Use the simulator to build intuition, then switch to Student
                mode to practice with auto-graded problems or Teacher mode to
                see class analytics.
              </p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() =>
                setMode(mode === "explore" ? "student" : "explore")
              }
            >
              {mode === "explore" ? "Open practice" : "Back to explore"}{" "}
              <ArrowRight size={14} />
            </button>
          </section>
          <footer className="app-footer">
            <span>{course.footer}</span>
            <span>
              {accounts
                ? "Progress saved to your account"
                : "Progress saved in this browser"}
            </span>
            <Copyright />
          </footer>
        </div>
      </main>
    </div>
  );
}

/** Shown in place of Student or Teacher mode when an account (or a different role) is needed. */
function Gate({
  title,
  text,
  actions,
}: {
  title: string;
  text: string;
  actions?: ReactNode;
}) {
  return (
    <section className="panel auth-gate">
      <div className="panel-heading">
        <div>
          <span className="kicker">ACCOUNT</span>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <span className="panel-icon">
          <Lock size={19} />
        </span>
      </div>
      {actions && <div className="la-row">{actions}</div>}
    </section>
  );
}
