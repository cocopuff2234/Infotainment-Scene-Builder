-- Run AFTER migrations against a disposable/local Supabase database as postgres:
-- psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/projects_rls.sql
-- No extensions or pgTAP required. Every fixture and write is rolled back.
\set ON_ERROR_STOP on
begin;
set local plpgsql.check_asserts = on;

insert into auth.users (id, email) values
  ('a6111500-0000-4000-8000-000000000001', 'projects-rls-a@example.invalid'),
  ('b6111500-0000-4000-8000-000000000002', 'projects-rls-b@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6111500-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a6111500-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- A can create/read its project. Even direct inserts cannot forge revision/timestamps.
insert into public.projects (id, owner_id, name, document, revision, created_at, updated_at)
values (
  'c6111500-0000-4000-8000-000000000003',
  'a6111500-0000-4000-8000-000000000001',
  'A project',
  '{"schemaVersion":1,"name":"A project","screen":{"width":1000,"height":620},"startSceneId":"main","scenes":[{"id":"main","name":"Main","elements":[]}]}',
  99, '2000-01-01', '2000-01-01'
);

do $$
declare
  before_row public.projects%rowtype;
  after_row public.projects%rowtype;
  affected integer;
begin
  select * into strict before_row from public.projects
    where id = 'c6111500-0000-4000-8000-000000000003';
  assert before_row.revision = 1, 'Insert revision must be 1';
  assert before_row.created_at = before_row.updated_at, 'Insert timestamps must match';
  assert before_row.created_at > '2000-01-01'::timestamptz, 'Insert timestamps must be server-owned';

  update public.projects set name = 'A edited', document = jsonb_set(document, '{name}', '"A edited"')
    where id = before_row.id and revision = 1 returning * into strict after_row;
  assert after_row.revision = 2, 'Update must increment revision exactly once';
  assert after_row.updated_at > before_row.updated_at, 'Update must refresh timestamp';
  assert after_row.created_at = before_row.created_at, 'Creation timestamp must be stable';

  update public.projects set name = 'stale', document = jsonb_set(document, '{name}', '"stale"')
    where id = before_row.id and revision = 1;
  get diagnostics affected = row_count;
  assert affected = 0, 'Stale save must affect zero rows';
  delete from public.projects where id = before_row.id and revision = 1;
  get diagnostics affected = row_count;
  assert affected = 0, 'Stale delete must affect zero rows';

  begin
    update public.projects set name = 'Mismatched metadata' where id = before_row.id;
    raise exception 'Expected document/name consistency failure';
  exception when check_violation then null;
  end;
  begin
    update public.projects set document = '{}'::jsonb where id = before_row.id;
    raise exception 'Expected document shape failure';
  exception when check_violation then null;
  end;
  begin
    update public.projects set document = jsonb_set(document, '{scenes}', 'null') where id = before_row.id;
    raise exception 'Expected scenes shape failure';
  exception when check_violation then null;
  end;
  begin
    update public.projects set owner_id = 'b6111500-0000-4000-8000-000000000002' where id = before_row.id;
    raise exception 'Expected immutable owner failure';
  exception when invalid_parameter_value then null;
  end;
  begin
    update public.projects set id = 'd6111500-0000-4000-8000-000000000004' where id = before_row.id;
    raise exception 'Expected immutable id failure';
  exception when invalid_parameter_value then null;
  end;
  begin
    update public.projects set created_at = '2000-01-01' where id = before_row.id;
    raise exception 'Expected immutable created_at failure';
  exception when invalid_parameter_value then null;
  end;
  begin
    update public.projects set revision = 100 where id = before_row.id;
    raise exception 'Expected server-owned revision failure';
  exception when invalid_parameter_value then null;
  end;
  select * into strict after_row from public.projects where id = before_row.id;
  assert after_row.revision = 2, 'Failed writes must not change revision';
end;
$$;

-- B cannot see, update, delete, or create a project owned by A.
select set_config('request.jwt.claim.sub', 'b6111500-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"b6111500-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
declare affected integer;
begin
  assert not exists (select 1 from public.projects where id = 'c6111500-0000-4000-8000-000000000003'),
    'B must not read A project';
  update public.projects set updated_at = clock_timestamp()
    where id = 'c6111500-0000-4000-8000-000000000003' and revision = 2;
  get diagnostics affected = row_count;
  assert affected = 0, 'B must not update A project';
  delete from public.projects where id = 'c6111500-0000-4000-8000-000000000003' and revision = 2;
  get diagnostics affected = row_count;
  assert affected = 0, 'B must not delete A project';
  begin
    insert into public.projects (owner_id, name, document) values (
      'a6111500-0000-4000-8000-000000000001', 'Forged',
      '{"schemaVersion":1,"name":"Forged","screen":{"width":1000,"height":620},"startSceneId":"main","scenes":[{"id":"main","name":"Main","elements":[]}]}'
    );
    raise exception 'Expected owner WITH CHECK denial';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- B can still perform CRUD on its own project; A cannot see it.
insert into public.projects (id, owner_id, name, document) values (
  'd6111500-0000-4000-8000-000000000004',
  'b6111500-0000-4000-8000-000000000002', 'B project',
  '{"schemaVersion":1,"name":"B project","screen":{"width":1000,"height":620},"startSceneId":"main","scenes":[{"id":"main","name":"Main","elements":[]}]}'
);
do $$
declare actual_revision integer;
begin
  update public.projects set document = document
    where id = 'd6111500-0000-4000-8000-000000000004' and revision = 1
    returning revision into strict actual_revision;
  assert actual_revision = 2, 'B must update its own project';
end;
$$;

select set_config('request.jwt.claim.sub', 'a6111500-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a6111500-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare affected integer;
begin
  assert not exists (select 1 from public.projects where id = 'd6111500-0000-4000-8000-000000000004'),
    'A must not read B project';
  delete from public.projects where id = 'c6111500-0000-4000-8000-000000000003' and revision = 2;
  get diagnostics affected = row_count;
  assert affected = 1, 'A must delete its own project at the current revision';
end;
$$;

select set_config('request.jwt.claim.sub', 'b6111500-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"b6111500-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
declare affected integer;
begin
  delete from public.projects where id = 'd6111500-0000-4000-8000-000000000004' and revision = 2;
  get diagnostics affected = row_count;
  assert affected = 1, 'B must delete its own project';
end;
$$;

-- Anonymous clients have no table privileges, even if a forged subject is supplied.
reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.projects;
    raise exception 'Expected anonymous SELECT denial';
  exception when insufficient_privilege then null;
  end;
  assert not has_table_privilege(current_user, 'public.projects', 'INSERT'), 'Anon must not insert';
  assert not has_table_privilege(current_user, 'public.projects', 'UPDATE'), 'Anon must not update';
  assert not has_table_privilege(current_user, 'public.projects', 'DELETE'), 'Anon must not delete';
end;
$$;

reset role;
rollback;
\echo 'Project RLS, metadata, schema, and optimistic revision tests passed (fixtures rolled back).'
