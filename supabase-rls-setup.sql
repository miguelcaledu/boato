-- ============================================================
-- BOATO — Lock down the submissions table
-- ------------------------------------------------------------
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New query
-- → paste this whole file → Run.
--
-- What this does:
--   1. Turns on Row Level Security so the public API key can no
--      longer read/edit/delete rows directly (which is currently
--      possible — anyone with your site's public key can pull the
--      whole guest list with a single curl command).
--   2. Keeps the public reservation/inquiry/newsletter forms working
--      — they only ever need to INSERT a new row, which stays open.
--   3. Adds password-gated functions that the /admin and /sakra
--      dashboards call instead of reading the table directly. The
--      real password check now happens inside the database, not in
--      client-side JS that anyone can read via "View Source".
--
-- IMPORTANT: change the two password strings below (search for
-- 'M&Mangelcal' and 'sakra') to match whatever you set as
-- ADMIN_PASSWORD / SAKRA_PASSWORD in the site code, and keep them
-- in sync if you ever change one — both must be updated together.
-- ============================================================

-- 1) Lock the table down
alter table submissions enable row level security;

-- 2) Public forms can still create new submissions, no password needed
drop policy if exists "public can insert" on submissions;
create policy "public can insert" on submissions
  for insert to anon
  with check (true);

-- (No SELECT/UPDATE/DELETE policy for anon = those are now blocked
-- by default. The functions below are the only way back in, and
-- each one checks a password first.)

-- 3) Admin: read everything
create or replace function admin_get_submissions(secret text)
returns setof submissions
language plpgsql
security definer
set search_path = public
as $$
begin
  if secret is distinct from 'M&Mangelcal' then
    raise exception 'unauthorized';
  end if;
  return query select * from submissions order by ts desc;
end;
$$;
grant execute on function admin_get_submissions(text) to anon;

-- 4) Admin: update read/paid/data on any row
create or replace function admin_update_submission(
  secret text, row_id text,
  new_read boolean default null,
  new_paid boolean default null,
  new_data jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if secret is distinct from 'M&Mangelcal' then
    raise exception 'unauthorized';
  end if;
  update submissions set
    read = coalesce(new_read, read),
    paid = coalesce(new_paid, paid),
    data = coalesce(new_data, data)
  where id = row_id;
end;
$$;
grant execute on function admin_update_submission(text, text, boolean, boolean, jsonb) to anon;

-- 5) Admin: delete any row
create or replace function admin_delete_submission(secret text, row_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if secret is distinct from 'M&Mangelcal' then
    raise exception 'unauthorized';
  end if;
  delete from submissions where id = row_id;
end;
$$;
grant execute on function admin_delete_submission(text, text) to anon;

-- 6) Sakra: read ONLY their own pop-up's rows (server-side filter,
-- not just a client-side one — even someone who extracts this
-- function call from the JS can never see other guests' data)
create or replace function sakra_get_submissions(secret text)
returns setof submissions
language plpgsql
security definer
set search_path = public
as $$
begin
  if secret is distinct from 'sakra' then
    raise exception 'unauthorized';
  end if;
  return query
    select * from submissions
    where type = 'popup' and data->>'Dinner' = 'Boato x Taberna Sakra'
    order by ts desc;
end;
$$;
grant execute on function sakra_get_submissions(text) to anon;

-- 7) Sakra: update only rows belonging to their own pop-up
create or replace function sakra_update_submission(secret text, row_id text, new_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if secret is distinct from 'sakra' then
    raise exception 'unauthorized';
  end if;
  update submissions set data = new_data
  where id = row_id
    and type = 'popup' and data->>'Dinner' = 'Boato x Taberna Sakra';
end;
$$;
grant execute on function sakra_update_submission(text, text, jsonb) to anon;

-- 8) Sakra: delete only rows belonging to their own pop-up
create or replace function sakra_delete_submission(secret text, row_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if secret is distinct from 'sakra' then
    raise exception 'unauthorized';
  end if;
  delete from submissions
  where id = row_id
    and type = 'popup' and data->>'Dinner' = 'Boato x Taberna Sakra';
end;
$$;
grant execute on function sakra_delete_submission(text, text) to anon;
