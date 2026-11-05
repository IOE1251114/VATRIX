-- VATRIX database schema for Supabase (PostgreSQL), with student and teacher accounts.
-- Run this whole file in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is safe to run again (and to run over the earlier, account-less version): every statement
-- checks whether its object already exists, and old policies are replaced.
--
-- Security model
--   • Everyone must sign in (Supabase Auth, email + password) to practise or see any data.
--     The visualizers themselves stay open to everyone.
--   • A new account is a STUDENT. It becomes a TEACHER only if its email is listed in
--     public.teacher_emails — a table only the project owner can edit (Table Editor / SQL).
--   • Students read and write only their own rows. Teachers read everyone's progress,
--     create assignments, and add or remove the demo class.
--   • Keep "Confirm email" ON (Authentication → Sign In / Providers → Email). Teacher rights are
--     tied to an email address, and only a confirmed address proves the person owns it. With
--     confirmation off, anyone could sign up with a listed teacher's email and see every student.

-- ---------- Progress tables ----------

create table if not exists public.students (
  id          text primary key check (id ~ '^[a-z0-9-]{1,80}$'),   -- the auth user id (uuid) for real students
  name        text not null check (char_length(name) between 1 and 80),
  demo        boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.attempts (
  id             bigint generated always as identity primary key,
  student_id     text not null references public.students (id) on delete cascade,
  problem_id     text not null check (char_length(problem_id) <= 40),
  topic          text not null check (char_length(topic) <= 40),
  correct        boolean not null,
  given          text not null default '' check (char_length(given) <= 200),
  misconception  text check (char_length(misconception) <= 200),
  hint           boolean not null default false,
  at             timestamptz not null default now()
);
create index if not exists attempts_student_at on public.attempts (student_id, at);

create table if not exists public.activity (
  student_id  text not null references public.students (id) on delete cascade,
  topic       text not null check (char_length(topic) <= 40),
  seconds     integer not null default 0 check (seconds >= 0),
  steps       integer not null default 0 check (steps >= 0),
  updated_at  timestamptz not null default now(),
  primary key (student_id, topic)
);

create table if not exists public.assignments (
  id           text primary key check (char_length(id) <= 40),
  title        text not null check (char_length(title) between 1 and 200),
  problem_ids  text[] not null,
  auto         boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------- Accounts and roles ----------

-- Emails allowed to be teachers. Add a row here (lower-case) to make someone a teacher.
create table if not exists public.teacher_emails (
  email     text primary key check (email = lower(email)),
  added_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  email       text not null,
  role        text not null default 'student' check (role in ('student', 'teacher')),
  created_at  timestamptz not null default now()
);

-- True when the signed-in user is a teacher. SECURITY DEFINER so policies can call it without
-- needing read access to every profile.
-- The account's email must also be confirmed. This only protects you while "Confirm email" is
-- on: with it off, Supabase marks every new address as confirmed automatically.
create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.role = 'teacher' and u.email_confirmed_at is not null
  );
$$;

-- Creates the profile (and, for students, the progress row) when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r text;
  n text;
begin
  r := case when exists (select 1 from public.teacher_emails where email = lower(new.email)) then 'teacher' else 'student' end;
  n := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)), 80);
  insert into public.profiles (id, name, email, role) values (new.id, n, lower(new.email), r)
    on conflict (id) do nothing;
  if r = 'student' then
    insert into public.students (id, name) values (new.id::text, n) on conflict (id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Adding or removing a teacher email updates an existing account's role straight away.
create or replace function public.sync_teacher_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set role = 'teacher' where email = new.email;
    return new;
  else
    update public.profiles set role = 'student' where email = old.email;
    insert into public.students (id, name)
      select p.id::text, p.name from public.profiles p where p.email = old.email
      on conflict (id) do nothing;
    return old;
  end if;
end $$;

drop trigger if exists on_teacher_email_change on public.teacher_emails;
create trigger on_teacher_email_change after insert or delete on public.teacher_emails
  for each row execute function public.sync_teacher_role();

-- Accounts created before this file was run get a profile too.
insert into public.profiles (id, name, email, role)
select u.id,
       left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)), 80),
       lower(u.email),
       case when exists (select 1 from public.teacher_emails t where t.email = lower(u.email)) then 'teacher' else 'student' end
from auth.users u
on conflict (id) do nothing;

-- ---------- Row Level Security ----------

alter table public.students       enable row level security;
alter table public.attempts       enable row level security;
alter table public.activity       enable row level security;
alter table public.assignments    enable row level security;
alter table public.profiles       enable row level security;
alter table public.teacher_emails enable row level security;  -- no policies: dashboard only

-- Remove every earlier policy (including the old open, no-login ones).
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('students', 'attempts', 'activity', 'assignments', 'profiles', 'teacher_emails')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- profiles: see your own; teachers see all.
create policy "own or teacher reads profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_teacher());

-- students
create policy "own or teacher reads students" on public.students for select to authenticated
  using (id = auth.uid()::text or public.is_teacher());
create policy "add own or demo student" on public.students for insert to authenticated
  with check ((id = auth.uid()::text and not demo) or (demo and public.is_teacher()));
create policy "teacher removes demo students" on public.students for delete to authenticated
  using (demo and public.is_teacher());

-- attempts
create policy "own or teacher reads attempts" on public.attempts for select to authenticated
  using (student_id = auth.uid()::text or public.is_teacher());
create policy "add own or demo attempts" on public.attempts for insert to authenticated
  with check (
    student_id = auth.uid()::text
    or (public.is_teacher() and exists (select 1 from public.students s where s.id = student_id and s.demo))
  );

-- activity
create policy "own or teacher reads activity" on public.activity for select to authenticated
  using (student_id = auth.uid()::text or public.is_teacher());
create policy "add own or demo activity" on public.activity for insert to authenticated
  with check (
    student_id = auth.uid()::text
    or (public.is_teacher() and exists (select 1 from public.students s where s.id = student_id and s.demo))
  );
create policy "update own activity" on public.activity for update to authenticated
  using (student_id = auth.uid()::text) with check (student_id = auth.uid()::text);

-- assignments: every signed-in user reads them; only teachers create them.
create policy "signed-in users read assignments" on public.assignments for select to authenticated
  using (true);
create policy "teachers add assignments" on public.assignments for insert to authenticated
  with check (public.is_teacher());

-- ---------- Realtime ----------
-- Lets an open Teacher dashboard update by itself when a student answers a question
-- (each user only receives changes their policies allow them to read).

do $$
declare t text;
begin
  foreach t in array array['students', 'attempts', 'activity', 'assignments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- Make yourself a teacher ----------
-- After running this file, add your email (lower-case) and sign up / sign in on the website:
--   insert into public.teacher_emails (email) values ('you@example.com');
